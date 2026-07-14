// backend/routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import passport from "passport";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";

import sendEmail from "../utils/sendEmail.js";
import User from "../models/User.js";
import Staff from "../models/Staff.js";
import generateToken from "../utils/generateToken.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================================================
   RATE LIMITERS
========================================================= */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 login attempts per window
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,                    // 3 forgot-password attempts per window
  message: { message: "Too many password reset requests. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

/* =========================================================
   PASSWORD VALIDATION HELPER
========================================================= */
function validatePassword(password) {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number.";
  }
  return null; // valid
}

/* =========================================================
   MULTER SETUP (avatars)
========================================================= */
const avatarsDir = path.join(process.cwd(), "uploads", "avatars");
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) { cb(null, avatarsDir); },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

/* =========================================================
   SIGNUP
========================================================= */
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  // Server-side password validation
  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      provider: "local",
      verified: false,
      otpCode,
      otpExpires,
    });

    // Send OTP email
    sendEmail({
      to: user.email,
      subject: "Your Rentify Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #0f172a;">Welcome to Rentify!</h2>
          <p style="color: #64748b; font-size: 16px;">Use the code below to verify your email address and activate your account.</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb; margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 8px;">
            ${otpCode}
          </div>
          <p style="color: #94a3b8; font-size: 14px;">This code expires in 10 minutes.</p>
        </div>
      `,
    }).catch(err => console.error("OTP send failed", err));

    res.status(201).json({
      message: "OTP sent successfully",
      requireOtp: true,
      email: user.email,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================================================
   VERIFY OTP
========================================================= */
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.verified) return res.status(400).json({ message: "User already verified" });
    if (user.otpCode !== otp) return res.status(400).json({ message: "Invalid OTP code" });
    if (new Date() > user.otpExpires) return res.status(400).json({ message: "OTP has expired" });

    user.verified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: generateToken(user._id),
      message: "Email verified successfully!",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================================================
   RESEND OTP / UPDATE EMAIL
========================================================= */
router.post("/resend-otp", async (req, res) => {
  const { oldEmail, newEmail } = req.body;
  try {
    const targetEmail = oldEmail.toLowerCase();
    const user = await User.findOne({ email: targetEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.verified) return res.status(400).json({ message: "User is already verified" });

    if (newEmail && newEmail.toLowerCase() !== targetEmail) {
      const exists = await User.findOne({ email: newEmail.toLowerCase() });
      if (exists) return res.status(400).json({ message: "New email is already in use" });
      user.email = newEmail.toLowerCase();
    }

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    user.otpCode = otpCode;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    sendEmail({
      to: user.email,
      subject: "Your New Rentify Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #0f172a;">Rentify Verification</h2>
          <p style="color: #64748b; font-size: 16px;">Here is your new verification code.</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb; margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 8px;">
            ${otpCode}
          </div>
          <p style="color: #94a3b8; font-size: 14px;">This code expires in 10 minutes.</p>
        </div>
      `,
    }).catch(err => console.error("OTP send failed", err));

    res.status(200).json({ message: "New OTP sent", email: user.email });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================================================
   LOGIN
========================================================= */
router.post("/login", loginLimiter, async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // IMPORTANT: Check Staff collection FIRST.
    // After the DB split, admin/staff accounts may still have stale records in User.
    // By checking Staff first, we ensure they authenticate against the correct collection.
    let user = await Staff.findOne({ email: email.toLowerCase() });
    let isStaff = !!user;

    if (!user) {
      user = await User.findOne({ email: email.toLowerCase() });
    }

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (user.provider === "google") {
      return res.status(400).json({
        message: "This account uses Google login. Please continue with Google.",
      });
    }

    // Staff accounts might not require email verification in the same way, but let's keep it consistent
    if (!isStaff && !user.verified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

    // Block suspended/banned users from logging in
    if (user.status === "blocked") {
      return res.status(403).json({
        message: "Your account has been suspended. Please contact support for assistance.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    res.json({
      token: generateToken(user._id, isStaff),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        ownerType: user.ownerType,
        verified: user.verified,
        isKycVerified: user.isKycVerified,
        verificationStatus: user.verificationStatus,
        profilePic: user.profilePic,
        phone: user.phone,
        provider: user.provider,
        isStaff, // explicit flag for frontend if needed
      },
    });
  } catch (err) {
    next(err);
  }
});

/* =========================================================
   VERIFY EMAIL
========================================================= */
router.get("/verify-email/:token", async (req, res) => {
  const user = await User.findOne({ emailVerificationToken: req.params.token });

  if (!user) {
    return res.status(400).send("Invalid or expired verification link");
  }

  user.verified = true;
  user.emailVerifiedAt = new Date();
  user.emailVerificationToken = undefined;
  await user.save();

  let frontendUrl = (process.env.FRONTEND_URL || "https://rentify.lk").trim();
  if (!frontendUrl.startsWith("http")) frontendUrl = "https://" + frontendUrl;
  
  res.redirect(`${frontendUrl}/auth`);
});

/* =========================================================
   CURRENT USER
========================================================= */
router.get("/me", protect, async (req, res, next) => {
  try {
    let userModel = ['staff', 'admin', 'superadmin'].includes(req.user.role) ? Staff : User;
    const user = await userModel.findById(req.user._id)
      .populate('rentWishlist')
      .populate('saleWishlist')
      .select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = user.toObject();
    // Ensure isStaff flag is present for frontend normalization
    if (['staff', 'admin', 'superadmin'].includes(userData.role)) {
      userData.isStaff = true;
    }
    res.json(userData);
  } catch (err) {
    next(err);
  }
});

/* =========================================================
   GOOGLE AUTH
========================================================= */
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false, prompt: "select_account" })
);

router.get(
  "/google/callback",
  (req, res, next) => {
    let frontendUrl = (process.env.FRONTEND_URL || "https://rentify.lk").trim();
    if (!frontendUrl.startsWith("http")) frontendUrl = "https://" + frontendUrl;
    
    passport.authenticate("google", {
      session: false,
      failureRedirect: `${frontendUrl}/auth`,
    })(req, res, next);
  },
  (req, res) => {
    let frontendUrl = (process.env.FRONTEND_URL || "https://rentify.lk").trim();
    if (!frontendUrl.startsWith("http")) frontendUrl = "https://" + frontendUrl;

    // Block suspended/banned users from logging in via Google
    if (req.user.status === "blocked") {
      return res.redirect(`${frontendUrl}/auth?error=account_suspended`);
    }

    // Detect if this user is staff/admin (for correct JWT flag)
    const isStaff = ['staff', 'admin', 'superadmin'].includes(req.user.role);
    const token = generateToken(req.user._id, isStaff);
    res.redirect(`${frontendUrl}/google-success?token=${token}`);
  }
);

/* =========================================================
   FORGOT PASSWORD
========================================================= */
router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body;
  try {
    let user = await Staff.findOne({ email: email.toLowerCase() });
    if (!user) user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "No account with this email" });
    if (user.provider === "google") {
      return res.status(400).json({ message: "This account uses Google login." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    // Hash the token before storing (so a DB leak won't expose usable tokens)
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    // Send the UNHASHED token to the user via email (they need it to reset)
    const frontendUrl = (process.env.FRONTEND_URL || "https://rentify.lk").trim();
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your Rentify password",
      html: `
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link expires in 15 minutes.</p>
      `,
    });

    res.json({ message: "Password reset link sent to your email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================================================
   RESET PASSWORD
========================================================= */
router.post("/reset-password/:token", async (req, res) => {
  const { password } = req.body;

  // Server-side password validation on reset too
  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  try {
    // Hash the incoming token to compare with the stored hashed version
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
    let user = await Staff.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });
    if (!user) {
      user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
      });
    }

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful. You can now login." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;



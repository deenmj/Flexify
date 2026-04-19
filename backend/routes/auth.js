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

    const token = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      provider: "local",
      verified: false,
      emailVerificationToken: token,
    });

    const backendUrl = process.env.BACKEND_URL || "https://flexify-production.up.railway.app";
    const verifyUrl = `${backendUrl}/api/auth/verify-email/${token}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Verify your Rentify account",
        html: `
          <h2>Welcome to Rentify 🚗</h2>
          <p>Please verify your email to activate your account:</p>
          <a href="${verifyUrl}" style="display:inline-block;background:#1890ff;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Verify Email</a>
        `,
      });
    } catch (emailErr) {
      console.error("Email send failed:", emailErr.message);
    }

    res.status(201).json({
      message: "Account created! Please check your email to verify your account.",
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================================================
   LOGIN
========================================================= */
router.post("/login", loginLimiter, async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (user.provider === "google") {
      return res.status(400).json({
        message: "This account uses Google login. Please continue with Google.",
      });
    }

    if (!user.verified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    res.json({
      token: generateToken(user._id),
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

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  res.redirect(`${frontendUrl}/auth`);
});

/* =========================================================
   CURRENT USER
========================================================= */
router.get("/me", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (err) {
    next(err);
  }
});

/* =========================================================
   GOOGLE AUTH
========================================================= */
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  (req, res, next) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    passport.authenticate("google", {
      session: false,
      failureRedirect: `${frontendUrl}/auth`,
    })(req, res, next);
  },
  (req, res) => {
    const token = generateToken(req.user._id);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/google-success?token=${token}`);
  }
);

/* =========================================================
   FORGOT PASSWORD
========================================================= */
router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
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
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
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
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

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

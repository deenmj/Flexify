// backend/routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import passport from "passport";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

import sendEmail from "../utils/sendEmail.js";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

console.log("✅ auth.js loaded");

/* =========================================================
   TEST ROUTE (VERY IMPORTANT)
========================================================= */
router.get("/test", (req, res) => {
  res.send("AUTH ROUTE WORKING");
});

/* =========================================================
   MULTER SETUP
========================================================= */
const avatarsDir = path.join(process.cwd(), "uploads", "avatars");
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, avatarsDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    cb(null, `${base}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

/* =========================================================
   AUTH ROUTES
========================================================= */

// SIGNUP
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,              // ✅ plain password
      provider: "local",
      verified: false,
      emailVerificationToken: token
    });

    const verifyUrl = `http://localhost:5000/api/auth/verify-email/${token}`;

    await sendEmail({
      to: user.email,
      subject: "Verify your Flexify account",
      html: `
        <h2>Welcome to Flexify 🚗</h2>
        <p>Please verify your email to activate your account:</p>
        <a href="${verifyUrl}">Verify Email</a>
      `
    });

    res.status(201).json({
      message: "Verification email sent. Please check your inbox."
    });

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 🚫 Google users must login via Google
    if (user.provider === "google") {
      return res.status(400).json({
        message: "This account uses Google login. Please continue with Google."
      });
    }

    // 🚫 Email not verified
    if (!user.verified) {
      return res.status(403).json({
        message: "Please verify your email before logging in"
      });
    }

    // 🔐 Password check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // ✅ Success
    res.json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: user.verified,
        profilePic: user.profilePic,
        provider: user.provider
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


//Verify email
router.get("/verify-email/:token", async (req, res) => {
  const user = await User.findOne({
    emailVerificationToken: req.params.token,
  });

  if (!user) {
    return res.status(400).send("Invalid or expired verification link");
  }

  user.verified = true;
  user.emailVerifiedAt = new Date();
  user.emailVerificationToken = undefined;

  await user.save();

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  res.redirect(`${frontendUrl}/auth`);
});

// CURRENT USER
router.get("/me", protect, async (req, res) => {
  res.json(req.user);
});

/* =========================================================
   GOOGLE AUTH
========================================================= */

// Redirect to Google
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Google callback
router.get(
  "/google/callback",
  (req, res, next) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    passport.authenticate("google", {
      session: false,
      failureRedirect: `${frontendUrl}/auth`,
    })(req, res, next);
  },
  (req, res) => {
    const token = generateToken(req.user._id);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/google-success?token=${token}`);
  }
);

// ===============================
// FORGOT PASSWORD
// ===============================
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: "No account with this email" });
    }

    // 🚫 Google users cannot reset password
    if (user.provider === "google") {
      return res.status(400).json({
        message: "This account uses Google login. Please sign in with Google."
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your Flexify password",
      html: `
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link expires in 15 minutes.</p>
      `
    });

    res.json({ message: "Password reset link sent to your email" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ===============================
// RESET PASSWORD
// ===============================
router.post("/reset-password/:token", async (req, res) => {
  const { password } = req.body;

  try {
    const user = await User.findOne({
      passwordResetToken: req.params.token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = password; // 🔐 hashed by pre-save hook
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    res.json({ message: "Password reset successful. You can now login." });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


export default router;

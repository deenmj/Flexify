// backend/routes/userRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";
import { sendSubadminAlert } from "../utils/notifier.js";

const router = express.Router();

// Ensure upload folders exist
const verificationDir = path.join(process.cwd(), "uploads", "verification");
const avatarsDir = path.join(process.cwd(), "uploads", "avatars");
if (!fs.existsSync(verificationDir)) fs.mkdirSync(verificationDir, { recursive: true });
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

// Multer for KYC verification documents
const kycStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, verificationDir),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`);
  },
});
const kycUpload = multer({
  storage: kycStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"), false);
  },
});

// Multer for profile picture uploads (separate from KYC)
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => {
    cb(null, `avatar-${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`);
  },
});
const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"), false);
  },
});

/**
 * KYC verification submission
 * Upload: nicFront, nicBack, license, selfie + text: address
 */
router.post(
  "/verify",
  protect,
  kycUpload.fields([
    { name: "nicFront", maxCount: 1 },
    { name: "nicBack", maxCount: 1 },
    { name: "license", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Check if already approved
      if (user.verificationStatus === "approved") {
        return res.status(400).json({ message: "Your KYC is already verified" });
      }

      const files = req.files || {};

      user.documents = {
        nicFront: files.nicFront ? `/uploads/verification/${files.nicFront[0].filename}` : user.documents?.nicFront || "",
        nicBack: files.nicBack ? `/uploads/verification/${files.nicBack[0].filename}` : user.documents?.nicBack || "",
        license: files.license ? `/uploads/verification/${files.license[0].filename}` : user.documents?.license || "",
        selfie: files.selfie ? `/uploads/verification/${files.selfie[0].filename}` : user.documents?.selfie || "",
        address: req.body.address || user.documents?.address || "",
        kycConsentGiven: req.body.kycConsentGiven === "true" || req.body.kycConsentGiven === true,
      };

      user.verificationStatus = "pending";

      // Update profile info
      if (req.body.fullName) user.name = req.body.fullName;
      if (req.body.phone) user.phone = req.body.phone;

      // NOTE: Do NOT set profilePic from KYC selfie — profile pic is separate

      await user.save();

      res.json({
        message: "KYC documents submitted successfully. Please wait for admin approval.",
        user,
      });
    } catch (err) {
      console.error("KYC submission error:", err);
      res.status(500).json({ message: "Error submitting verification" });
    }
  }
);

/**
 * Profile update
 */
router.put(
  "/update-profile",
  protect,
  profileUpload.fields([{ name: "profilePic", maxCount: 1 }]),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const files = req.files || {};

      if (req.body.name && !user.isKycVerified) user.name = req.body.name;
      if (req.body.phone) user.phone = req.body.phone;
      if (req.body.address) user.address = req.body.address;

      if (files.profilePic) {
        user.profilePic = `/uploads/avatars/${files.profilePic[0].filename}`;
      }

      await user.save();
      res.json({ message: "Profile updated successfully!", user });
    } catch (err) {
      console.error("Profile update error:", err);
      res.status(500).json({ message: "Error updating profile" });
    }
  }
);

/**
 * Register as owner (switch role to owner)
 */
router.post("/become-owner", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "owner") {
      return res.status(400).json({ message: "You are already registered as an owner" });
    }

    if (user.role !== "user") {
      return res.status(400).json({ message: "Only regular users can become owners" });
    }

    user.role = "owner";
    user.ownerType = "UNVERIFIED";
    
    // Initialize 3-month trial
    const trialEndDate = new Date();
    trialEndDate.setMonth(trialEndDate.getMonth() + 3);
    
    user.subscription = {
      tier: 'BASIC',
      status: 'trial',
      startDate: new Date(),
      endDate: trialEndDate
    };

    await user.save();

    res.json({ message: "You are now registered as an owner! 3-month trial started. Submit KYC to get verified.", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Update work notification email settings (for staff/subadmins)
 */
router.put("/notification-settings", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { notificationEmail, isNotificationEmailActive } = req.body;

    if (notificationEmail !== undefined) user.notificationEmail = notificationEmail;
    if (isNotificationEmailActive !== undefined) user.isNotificationEmailActive = isNotificationEmailActive;

    await user.save();
    res.json({ message: "Notification settings updated!", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

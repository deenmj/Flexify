// backend/routes/userRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";
import { sendSubadminAlert } from "../utils/notifier.js";

const router = express.Router();

// Ensure upload folder exists
const uploadDir = path.join(process.cwd(), "uploads", "verification");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`);
  },
});
const upload = multer({
  storage,
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
  upload.fields([
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
      };

      user.verificationStatus = "pending";

      // Update profile info
      if (req.body.fullName) user.name = req.body.fullName;
      if (req.body.phone) user.phone = req.body.phone;

      // Set profilePic from selfie
      if (files.selfie) {
        user.profilePic = `/uploads/verification/${files.selfie[0].filename}`;
      }

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
  upload.fields([{ name: "profilePic", maxCount: 1 }]),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const files = req.files || {};

      if (req.body.name && !user.isKycVerified) user.name = req.body.name;
      if (req.body.phone) user.phone = req.body.phone;
      if (req.body.address) user.address = req.body.address;

      if (files.profilePic) {
        user.profilePic = `/uploads/verification/${files.profilePic[0].filename}`;
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

export default router;

import express from "express";
import multer from "multer";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";
import { sendSubadminAlert } from "../utils/notifier.js";
import { kycStorage, profileStorage } from "../utils/cloudinary.js";

const router = express.Router();

const kycUpload = multer({
  storage: kycStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
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

      const files = req.files || {};

      user.documents = {
        nicFront: files.nicFront ? files.nicFront[0].path : user.documents?.nicFront || "",
        nicBack: files.nicBack ? files.nicBack[0].path : user.documents?.nicBack || "",
        license: files.license ? files.license[0].path : user.documents?.license || "",
        selfie: files.selfie ? files.selfie[0].path : user.documents?.selfie || "",
        address: req.body.address || user.documents?.address || "",
        kycConsentGiven: req.body.kycConsentGiven === "true" || req.body.kycConsentGiven === true,
      };

      // Auto-verify immediately for booking access
      user.isKycVerified = true;
      user.kycVerifiedAt = new Date();
      // Set to pending so staff can review them in the dashboard
      user.verificationStatus = "pending";

      // If user is an owner, promote to VERIFIED owner
      if (user.role === "owner" && user.ownerType === "UNVERIFIED") {
        user.ownerType = "VERIFIED";
      }

      // Update profile info
      if (req.body.fullName) user.name = req.body.fullName;
      if (req.body.phone) user.phone = req.body.phone;

      // NOTE: Do NOT set profilePic from KYC selfie — profile pic is separate

      await user.save();

      res.json({
        message: "KYC documents submitted successfully! You can now book vehicles.",
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
        user.profilePic = files.profilePic[0].path;
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

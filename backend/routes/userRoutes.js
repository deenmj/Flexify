import express from "express";
import multer from "multer";
import User from "../models/User.js";
import Staff from "../models/Staff.js";
import Vehicle from "../models/Vehicle.js";
import VehicleSale from "../models/VehicleSale.js";
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
 * Required: idNumber, phone, address
 * Optional: license image, selfie/profile image
 */
router.post(
  "/verify",
  protect,
  kycUpload.fields([
    { name: "license", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      let user = await Staff.findById(req.user._id);
      if (!user) user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Validate mandatory fields
      if (!req.body.idNumber || !req.body.idNumber.trim()) {
        return res.status(400).json({ message: "ID / License Number is required" });
      }
      if (!req.body.address || !req.body.address.trim()) {
        return res.status(400).json({ message: "Full address is required" });
      }
      if (!req.body.phone || !req.body.phone.trim()) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const files = req.files || {};

      user.documents = {
        idNumber: req.body.idNumber.trim(),
        phone: req.body.phone.trim(),
        license: files.license ? files.license[0].path : user.documents?.license || "",
        selfie: files.selfie ? files.selfie[0].path : user.documents?.selfie || "",
        address: req.body.address.trim(),
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
      let user = await Staff.findById(req.user._id);
      if (!user) user = await User.findById(req.user._id);
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
 * Update verification documents from Profile page
 * Users can re-upload individual documents + update address
 */
router.put(
  "/update-documents",
  protect,
  kycUpload.fields([
    { name: "license", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      let user = await Staff.findById(req.user._id);
      if (!user) user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Only allow updates if documents have been submitted at least once
      if (user.verificationStatus === "not_submitted") {
        return res.status(400).json({ message: "Please complete the initial verification first." });
      }

      const files = req.files || {};

      // Update only the fields that were provided
      if (!user.documents) user.documents = {};

      if (req.body.idNumber) user.documents.idNumber = req.body.idNumber.trim();
      if (req.body.phone) user.documents.phone = req.body.phone.trim();
      if (files.license) user.documents.license = files.license[0].path;
      if (files.selfie) user.documents.selfie = files.selfie[0].path;
      if (req.body.address) user.documents.address = req.body.address;

      // Mark for re-review by staff
      user.verificationStatus = "pending";

      await user.save();

      res.json({
        message: "Documents updated successfully! Our team will review the changes.",
        user,
      });
    } catch (err) {
      console.error("Document update error:", err);
      res.status(500).json({ message: "Error updating documents" });
    }
  }
);

/**
 * Register as owner (switch role to owner)
 */
router.post("/become-owner", protect, async (req, res) => {
  try {
    let user = await Staff.findById(req.user._id);
    if (!user) user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "owner") {
      return res.status(400).json({ message: "You are already registered as an owner" });
    }

    if (user.role !== "user") {
      return res.status(400).json({ message: "Only regular users can become owners" });
    }

    user.role = "owner";
    user.ownerType = "UNVERIFIED";
    
    // Initialize permanent FREE plan (2 vehicles, no expiry)
    user.subscription = {
      tier: 'FREE',
      status: 'free',
      startDate: new Date(),
      endDate: null
    };

    await user.save();

    res.json({ message: "You are now registered as an owner! Free plan activated (2 vehicle listings). Submit KYC to get verified.", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Update work notification email settings (for staff/subadmins)
 */
router.put("/notification-settings", protect, async (req, res) => {
  try {
    let user = await Staff.findById(req.user._id);
    if (!user) user = await User.findById(req.user._id);
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

/**
 * Test email sending manually
 */
import sendEmail from "../utils/sendEmail.js";

router.get("/test-email", protect, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const info = await sendEmail({
      to: userEmail,
      subject: "Test Email from Rentify Production",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Email Test Successful</h2>
          <p>If you are reading this, Brevo is working correctly via the V3 API!</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
        </div>
      `,
    });
    res.json({ message: "Test email initiated. Check logs for success/failure.", info });
  } catch (err) {
    res.status(500).json({ message: "Failed to initiate test email", error: err.message });
  }
});

/**
 * Toggle a Vehicle Sale in Wishlist
 */
router.post("/wishlist/sale/:id", protect, async (req, res) => {
  try {
    let user = await Staff.findById(req.user._id);
    if (!user) user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const saleId = req.params.id;
    if (!user.saleWishlist) user.saleWishlist = [];

    const index = user.saleWishlist.findIndex(id => id.toString() === saleId);
    if (index === -1) {
      user.saleWishlist.push(saleId);
    } else {
      user.saleWishlist.splice(index, 1);
    }

    await user.save();
    res.json({ message: "Wishlist updated", saleWishlist: user.saleWishlist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Get Wishlist Sales
 */
router.get("/wishlist/sale", protect, async (req, res) => {
  try {
    let user = await Staff.findById(req.user._id).populate("saleWishlist");
    if (!user) user = await User.findById(req.user._id).populate("saleWishlist");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.saleWishlist || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Toggle a Rental Vehicle in Wishlist
 */
router.post("/wishlist/rent/:id", protect, async (req, res) => {
  try {
    let user = await Staff.findById(req.user._id);
    if (!user) user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const vehicleId = req.params.id;
    if (!user.rentWishlist) user.rentWishlist = [];

    const index = user.rentWishlist.findIndex(id => id.toString() === vehicleId);
    if (index === -1) {
      user.rentWishlist.push(vehicleId);
    } else {
      user.rentWishlist.splice(index, 1);
    }

    await user.save();
    res.json({ message: "Wishlist updated", rentWishlist: user.rentWishlist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Get Wishlist Rentals
 */
router.get("/wishlist/rent", protect, async (req, res) => {
  try {
    let user = await Staff.findById(req.user._id).populate("rentWishlist");
    if (!user) user = await User.findById(req.user._id).populate("rentWishlist");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.rentWishlist || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;



import express from "express";
import multer from "multer";
import User from "../models/User.js";
import Staff from "../models/Staff.js";
import Vehicle from "../models/Vehicle.js";
import VehicleSale from "../models/VehicleSale.js";
import { protect, requireStaff } from "../middleware/authMiddleware.js";
import { sendSubadminAlert } from "../utils/notifier.js";
import { profileStorage } from "../utils/cloudinary.js";

const router = express.Router();

const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

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

      if (req.body.name) user.name = req.body.name;
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

/**
 * Get pending sales verification requests
 */
router.get("/pending-sales", protect, requireStaff, async (req, res) => {
  try {
    const pendingUsers = await User.find({ salesVerificationStatus: "pending" })
      .select("name email phone documents salesVerificationStatus createdAt");
    res.json(pendingUsers);
  } catch (err) {
    res.status(500).json({ message: "Error fetching pending sales requests" });
  }
});

/**
 * Approve sales verification request
 */
router.put("/:id/approve-sales", protect, requireStaff, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.salesVerificationStatus = "approved";
    await user.save();

    res.json({ message: "Sales verification approved successfully!", user });
  } catch (err) {
    res.status(500).json({ message: "Error approving sales request" });
  }
});

/**
 * User requests sales access manually
 */
router.post("/request-sales", protect, async (req, res) => {
  try {
    let user = await Staff.findById(req.user._id);
    if (!user) user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.salesRequestStatus = "pending";
    await user.save();
    res.json({ message: "Sales access request sent to staff.", user });
  } catch (err) {
    res.status(500).json({ message: "Error requesting sales access", error: err.message });
  }
});

/**
 * Admin fetch pending sales access requests
 */
router.get("/pending-sales-requests", protect, requireStaff, async (req, res) => {
  try {
    const users = await User.find({ 
      $or: [
        { salesRequestStatus: { $ne: "none" } },
        { hasSalesAccess: true }
      ]
    })
      .select("-password")
      .sort({ updatedAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching pending sales requests", error: err.message });
  }
});

/**
 * Admin approve or reject sales access request
 */
router.put("/:id/handle-sales-request", protect, requireStaff, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { approve } = req.body;
    if (approve === true) {
      user.hasSalesAccess = true;
      user.salesRequestStatus = "approved";
    } else {
      user.hasSalesAccess = false;
      user.salesRequestStatus = "rejected";
    }

    await user.save();
    res.json({ message: approve ? "Sales access approved" : "Sales access rejected", user });
  } catch (err) {
    res.status(500).json({ message: "Error handling sales request", error: err.message });
  }
});

export default router;



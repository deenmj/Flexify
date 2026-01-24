// backend/routes/ownerRoutes.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Ensure upload folder exists
const uploadDir = path.join(process.cwd(), "uploads", "ids");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`);
  },
});
const upload = multer({ storage });

/**
 * Normal owner verification (personal/business) -> creates verificationRequest only
 * Do NOT change the user's role or verified flag here.
 */
router.post("/verify", protect, upload.single("idFile"), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const filePath = req.file ? `/uploads/ids/${req.file.filename}` : null;

    user.verificationRequest = {
      fullName: req.body.fullName || user.name,
      email: req.body.email || user.email,
      phone: req.body.phone || "",
      address: req.body.address || "",
      years: req.body.years ? Number(req.body.years) : undefined,
      description: req.body.description || "",
      idFile: filePath,
      status: "pending",
      type: "normal-owner",
      submittedAt: new Date(),
    };

    // Ensure we do NOT promote the user here
    user.verified = user.verified === true; // keep current verified value (do not change)
    // keep role as-is (likely "user" until admin approves)
    await user.save();

    res.json({ message: "Verification request submitted!", request: user.verificationRequest });
  } catch (err) {
    console.error("owner verify error:", err);
    res.status(500).json({ message: "Error submitting request" });
  }
});

/**
 * Verified business / rent provider submission
 * Accepts multiple documents; stores into user.verifiedBusiness and creates a verificationRequest
 * Do NOT set user.role = 'owner' or user.verified = true here.
 */
// REPLACE the existing verify-business route in backend/routes/ownerRoutes.js
router.post(
  "/verify-business",
  protect,
  // multer fields wrapper (we call multer here and handle errors manually)
  (req, res, next) => {
    const uploader = multer({
      storage,
    }).fields([
      { name: "businessLicense", maxCount: 1 },
      { name: "idFile", maxCount: 1 },
      { name: "idFrontBack", maxCount: 2 },
      { name: "drivingLicense", maxCount: 1 },
      { name: "proofOfAddress", maxCount: 1 },
      { name: "additionalDocs", maxCount: 5 },
    ]);

    uploader(req, res, (err) => {
      if (err) {
        // Multer error (bad field name, too many files, etc.)
        console.error("Multer upload error:", err);
        return res.status(400).json({ message: err.message || "File upload error" });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Build docs list from req.files (keep same field names as frontend)
      const filePaths = {};
      if (req.files && typeof req.files === "object") {
        for (const field in req.files) {
          filePaths[field] = req.files[field].map((f) => `/uploads/ids/${f.filename}`);
        }
      }

      user.verifiedBusiness = {
        businessName: req.body.businessName || req.body.companyName || "",
        contactEmail: req.body.contactEmail || req.body.email || user.email,
        phone: req.body.phone || "",
        address: req.body.address || "",
        registrationNo: req.body.registrationNo || req.body.regNumber || "",
        documents: Object.values(filePaths).flat(), // flatten all file arrays
        submittedAt: new Date(),
        approvedBy: null,
        approvedAt: null,
      };

      user.verificationRequest = {
        status: "pending",
        type: "verified-business",
        submittedAt: new Date(),
      };

      // Keep user unverified until admin approval
      user.role = user.role || "user";
      user.verified = false;

      await user.save();

      return res.json({
        message: "✅ Verified business request submitted for admin review.",
        verifiedBusiness: user.verifiedBusiness,
      });
    } catch (err) {
      console.error("verify-business error:", err);
      return res.status(500).json({ message: "Error submitting verified business form" });
    }
  }
);
// GET all verified business owners
router.get("/verified-owners", async (req, res) => {
  try {
    const owners = await User.find({ role: "verifiedOwner" }).select(
      "name profilePic verifiedBusiness"
    );

    res.json(owners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET unique dashboard data for logged-in owner
router.get("/my-dashboard", protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // count vehicles listed by this owner
    const vehicles = await Vehicle.find({ owner: userId });

    // count bookings received for those vehicles
    const bookings = await Booking.find({ owner: userId });

    // earnings (optional, only if your model exists)
    const earnings = await Earning.find({ owner: userId });

    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        role: req.user.role,
        verified: req.user.verified
      },
      stats: {
        vehicleCount: vehicles.length,
        bookingCount: bookings.length,
        earningCount: earnings?.length || 0
      },
      vehicles,
      bookings,
      earnings
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load dashboard" });
  }
});



export default router;

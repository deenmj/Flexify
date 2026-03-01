import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";

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
const upload = multer({ storage });

// Verification submission route
router.post(
  "/verify",
  protect,
  upload.fields([
    { name: "idFront", maxCount: 1 },
    { name: "idBack", maxCount: 1 },
    { name: "userPhoto", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const files = req.files || {};
      
      user.verificationRequest = {
        fullName: req.body.fullName || user.name,
        address: req.body.address || "",
        phone: req.body.phone || user.phone,
        idFront: files.idFront ? `/uploads/verification/${files.idFront[0].filename}` : null,
        idBack: files.idBack ? `/uploads/verification/${files.idBack[0].filename}` : null,
        userPhoto: files.userPhoto ? `/uploads/verification/${files.userPhoto[0].filename}` : null,
        status: "pending",
        type: "user-verification",
        submittedAt: new Date(),
      };

      // Also update user profile basic info if provided
      if (req.body.fullName) user.name = req.body.fullName;
      if (req.body.phone) user.phone = req.body.phone;

      await user.save();

      res.json({
        message: "Verification request submitted successfully. Please wait for staff approval.",
        user,
      });
    } catch (err) {
      console.error("User verification error:", err);
      res.status(500).json({ message: "Error submitting verification request" });
    }
  }
);

// Profile update route
router.put(
  "/update-profile",
  protect,
  upload.fields([{ name: "profilePic", maxCount: 1 }]),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const files = req.files || {};
      
      // Basic info update
      // Important: don't let verified users change their name (NIC verified)
      if (req.body.name && !user.verified) {
        user.name = req.body.name;
      }
      
      if (req.body.phone) user.phone = req.body.phone;
      if (req.body.address) user.address = req.body.address;
      
      if (files.profilePic) {
        user.profilePic = `/uploads/verification/${files.profilePic[0].filename}`;
      }

      await user.save();

      res.json({
        message: "Profile updated successfully!",
        user,
      });
    } catch (err) {
      console.error("Profile update error:", err);
      res.status(500).json({ message: "Error updating profile details" });
    }
  }
);

// test route
router.get("/test", (req, res) => {
  res.json({ message: "User route working!" });
});

export default router;

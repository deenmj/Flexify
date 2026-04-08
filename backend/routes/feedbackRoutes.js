import express from "express";
import Feedback from "../models/Feedback.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public feedback submission (optional auth)
router.post("/", async (req, res) => {
  try {
    const { type, message, contactEmail, deviceInfo } = req.body;
    
    const feedback = await Feedback.create({
      user: req.headers.authorization ? null : undefined, // Will handle user ID if protected
      type,
      message,
      contactEmail,
      deviceInfo
    });

    res.status(201).json({ message: "Thank you for your feedback!", feedback });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin view (protected)
router.get("/", protect, async (req, res) => {
  if (req.user.role !== "superadmin" && req.user.role !== "subadmin") {
    return res.status(403).json({ message: "Not authorized" });
  }
  const feedbacks = await Feedback.find().populate("user", "name email").sort({ createdAt: -1 });
  res.json(feedbacks);
});

export default router;

import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import Staff from "../models/Staff.js";
import Payment from "../models/Payment.js";
import multer from "multer";

import { receiptStorage } from "../utils/cloudinary.js";

const router = express.Router();

// Multer for payment receipts
const paymentUpload = multer({
  storage: receiptStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only image or PDF files are allowed"), false);
  },
});

/**
 * Request subscription upgrade or renewal (manual bank transfer)
 */
router.post("/subscribe", protect, paymentUpload.single("receipt"), async (req, res) => {
  try {
    const { tier, duration, amount, reference } = req.body;
    if (!['STANDARD', 'PRO'].includes(tier)) {
      return res.status(400).json({ message: "Invalid tier" });
    }
    if (!['MONTHLY', 'BI_ANNUAL'].includes(duration)) {
        return res.status(400).json({ message: "Invalid duration" });
    }
    if (!reference) {
        return res.status(400).json({ message: "Payment reference is required" });
    }
    let user = await Staff.findById(req.user._id);
    if (!user) user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const receiptPath = req.file ? req.file.path : null;

    // Create a pending payment record
    const payment = await Payment.create({
        user: user._id,
        tier,
        duration,
        amount,
        reference,
        status: "pending",
        receiptImage: receiptPath
    });
    
    res.json({ 
      message: `Your payment request for ${tier} (${duration}) has been submitted for verification. Activation takes 2-4 hours.`,
      paymentId: payment._id
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

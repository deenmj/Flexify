import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import { logAdminAction } from "../utils/auditLogger.js";

const router = express.Router();

/**
 * Request subscription upgrade or renewal
 */
router.post("/subscribe", protect, async (req, res) => {
  try {
    const { tier, duration, amount, reference } = req.body;
    if (!['BASIC', 'STANDARD', 'ENTERPRISE'].includes(tier)) {
      return res.status(400).json({ message: "Invalid tier" });
    }
    if (!['MONTHLY', 'BI_ANNUAL'].includes(duration)) {
        return res.status(400).json({ message: "Invalid duration" });
    }
    if (!reference) {
        return res.status(400).json({ message: "Payment reference is required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Create a pending payment record
    const payment = await Payment.create({
        user: user._id,
        tier,
        duration,
        amount,
        reference,
        status: "pending"
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

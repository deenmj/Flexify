import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import { logAdminAction } from "../utils/auditLogger.js";

const router = express.Router();

/**
 * Request subscription upgrade or renewal
 */
router.post("/subscribe", protect, async (req, res) => {
  try {
    const { tier } = req.body;
    if (!['BASIC', 'PRO'].includes(tier)) {
      return res.status(400).json({ message: "Invalid tier" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // In a real app, this would redirect to payment.
    // For MVP, we log the request for admin confirmation.
    
    // Logic: If user is on trial/expired, and requests same tier, it's a renewal.
    // If requests higher tier, it's an upgrade.
    
    res.json({ 
      message: `Upgrade request for ${tier} received. Please follow payment instructions and contact support with your proof of payment.`,
      requestedTier: tier
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

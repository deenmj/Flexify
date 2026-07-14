import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { isMasterCEO } from "../middleware/authMiddleware.js";
import Staff from "../models/Staff.js";

const router = express.Router();

// Get global financials (Placeholder)
router.get("/financials", protect, isMasterCEO, async (req, res) => {
  try {
    // In a real implementation, you'd aggregate all completed bookings
    // For now, return a placeholder
    const financials = {
      globalProfit: 5000000,
      commissionsInvoiced: 1200000,
      commissionsPaid: 1100000,
      rentalFees: 3800000,
    };
    res.json(financials);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all staff members
router.get("/staff", protect, isMasterCEO, async (req, res) => {
  try {
    const staff = await Staff.find({ role: { $ne: "superadmin" } }).select("-password");
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update global settings (Placeholder)
router.patch("/settings", protect, isMasterCEO, async (req, res) => {
  try {
    const { maintenanceMode, globalCommission } = req.body;
    // In a real implementation, save to a Settings model
    res.json({ message: "Global settings updated successfully", settings: { maintenanceMode, globalCommission } });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;



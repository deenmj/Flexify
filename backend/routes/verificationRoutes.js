import express from "express";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * USER: Submit verified business form
 * (Goes to admin review; sets verified = false)
 */
router.post("/", protect, async (req, res) => {
  try {
    const {
      companyName,
      regNumber,
      taxId,
      email,
      phone,
      address,
      website,
      serviceAreas,
      insurance,
      description,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.businessProfile = {
      companyName,
      regNumber,
      taxId,
      email,
      phone,
      address,
      website,
      serviceAreas,
      insurance,
      description,
    };

    user.verified = false;
    await user.save();

    res.status(200).json({
      message: "Verification request submitted for admin review",
      businessProfile: user.businessProfile,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

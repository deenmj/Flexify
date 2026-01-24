// backend/controllers/adminController.js
import Vehicle from "../models/Vehicle.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Earning from "../models/Earning.js";

/**
 * Admin: Dashboard stats
 */
export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalVehicles = await Vehicle.countDocuments();
    const pendingVehicles = await Vehicle.countDocuments({ approved: false });
    const totalBookings =
      (await Booking?.countDocuments({ status: "CONFIRMED" })) || 0;

    let totalEarnings = 0;
    let commissionCollected = 0;

    try {
      const earningData = await Earning.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            commission: { $sum: "$commission" },
          },
        },
      ]);
      if (earningData.length) {
        totalEarnings = earningData[0].total;
        commissionCollected = earningData[0].commission;
      }
    } catch {
      console.warn("Earning model optional – skipping aggregate");
    }

    res.json({
      totalUsers,
      totalVehicles,
      pendingVehicles,
      totalBookings,
      totalEarnings,
      commissionCollected,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * List pending vehicle approvals
 */
export const listPendingVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ approved: false }).populate(
      "owner",
      "name email role"
    );
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Approve owner verification (normal or verified-business)
 * Sets user.verified = true, role = owner, dashboardCreated = true
 * Also mark verificationRequest status and mark verifiedBusiness.approvedBy/approvedAt if exists
 */
/**
 * ✅ Approve owner verification (normal or verified-business)
 */
/**
 * ✅ Approve owner verification (normal or verified-business)
 * - Normal owners: verified = false, role = "owner"
 * - Verified businesses: verified = true, role = "verifiedOwner"
 */
// REPLACE the approveOwnerVerification function in backend/controllers/adminController.js

export const approveOwnerVerification = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found for approval" });

    // Mark verificationRequest as approved
    if (user.verificationRequest) {
      user.verificationRequest.status = "approved";
      user.verificationRequest.approvedAt = new Date();
    }

    // Distinguish verified-business (business) vs normal owner
    if (user.verificationRequest?.type === "verified-business") {
      user.role = "verifiedOwner";    // exact enum
      user.verified = true;           // verified business -> verified = true
    } else {
      // normal owner verification: make them owner but keep verified = false
      user.role = "owner";
      user.verified = false;
    }

    // mark dashboard created
    user.dashboardCreated = true;

    // if verifiedBusiness exists, stamp approval
    if (user.verifiedBusiness) {
      user.verifiedBusiness.approvedBy = req.user._id; // admin id
      user.verifiedBusiness.approvedAt = new Date();
    }

    await user.save();

    // Return the updated user (so frontend can update localStorage if needed)
    return res.json({ message: "✅ Verification approved and role updated", user });
  } catch (err) {
    console.error("approveOwnerVerification error:", err);
    return res.status(500).json({ message: err.message });
  }
};


/**
 * Reject owner verification
 */
export const rejectOwnerVerification = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found for rejection" });

    if (!user.verificationRequest) {
      return res.status(400).json({ message: "No verification request found for this user" });
    }

    user.verificationRequest.status = "rejected";
    user.verificationRequest.rejectedAt = new Date();
    await user.save();

    res.json({ message: "Verification request rejected", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * List pending owner verifications
 */
export const listPendingVerifications = async (req, res) => {
  try {
    const users = await User.find({ "verificationRequest.status": "pending" }).select("name email verificationRequest");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get single verification request (popup)
 */
export const getVerificationRequest = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("name email verificationRequest verifiedBusiness");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Combined admin requests (pending vehicles + pending verifications + archived verifications)
 */
export const getAdminRequests = async (req, res) => {
  try {
    const pendingVehicles = await Vehicle.find({ approved: false }).populate("owner", "name email");
    const pendingVerifications = await User.find({ "verificationRequest.status": "pending" }).select("name email verificationRequest verifiedBusiness");

    // Archived verification requests (approved or rejected)
    const archived = await User.find({
      "verificationRequest.status": { $in: ["approved", "rejected"] }
    }).select("name email verificationRequest verifiedBusiness");

    res.json({ pendingVehicles, pendingVerifications, archived });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

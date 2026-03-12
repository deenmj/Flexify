// backend/controllers/adminController.js
// SUPERADMIN controller — full platform management
import Vehicle from "../models/Vehicle.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { logAdminAction } from "../utils/auditLogger.js";


/**
 * Dashboard stats
 */
export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOwners = await User.countDocuments({ role: "owner" });
    const totalVehicles = await Vehicle.countDocuments();
    const pendingVehicles = await Vehicle.countDocuments({ status: "pending" });
    const activeVehicles = await Vehicle.countDocuments({ status: "active" });
    const totalBookings = await Booking.countDocuments();
    const confirmedBookings = await Booking.countDocuments({ status: "CONFIRMED" });
    const pendingKyc = await User.countDocuments({ verificationStatus: "pending" });

    let totalEarnings = 0;
    try {
      const earningData = await Booking.aggregate([
        { $match: { status: "CONFIRMED" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]);
      if (earningData.length) totalEarnings = earningData[0].total;
    } catch {
      // Earnings aggregation optional
    }

    res.json({
      totalUsers,
      totalOwners,
      totalVehicles,
      pendingVehicles,
      activeVehicles,
      totalBookings,
      confirmedBookings,
      pendingKyc,
      totalEarnings,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get ALL users (superadmin)
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Update user role (superadmin promotes/demotes)
 */
export const updateUserRole = async (req, res) => {
  try {
    const { role, ownerType } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent superadmin from demoting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot change your own role" });
    }

    const validRoles = ["user", "owner", "subadmin", "superadmin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const oldRole = user.role;
    user.role = role;

    // Set ownerType if promoting to owner
    if (role === "owner") {
      user.ownerType = ownerType === "VERIFIED" ? "VERIFIED" : "UNVERIFIED";
    } else {
      user.ownerType = null;
    }

    // Subadmins and superadmins are auto KYC verified
    if (role === "subadmin" || role === "superadmin") {
      user.isKycVerified = true;
      user.verificationStatus = "approved";
    }

    await user.save();

    // AUDIT LOG
    logAdminAction(req, "role_change", user._id, {
      oldRole,
      newRole: role,
      ownerType: user.ownerType
    });

    res.json({ message: `User role updated to ${role}`, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Delete user (superadmin)
 */
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot delete yourself" });
    }

    const targetId = user._id;
    const targetInfo = { name: user.name, email: user.email };

    await user.deleteOne();

    // AUDIT LOG
    logAdminAction(req, "user_delete", targetId, {
      reason: req.body.reason || "Admin panel action",
      userSnapshot: targetInfo
    });

    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get ALL vehicles (superadmin)
 */
export const getAllVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find()
      .populate("owner", "name email role ownerType")
      .sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get ALL bookings (superadmin)
 */
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user", "name email")
      .populate("owner", "name email phone")
      .populate("vehicle", "title make model")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get recent audit logs (superadmin)
 */
export const getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const logs = await AuditLog.find()
      .populate("performedBy", "name email")
      .populate("targetUser", "name email")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AuditLog.countDocuments();

    res.json({
      logs,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

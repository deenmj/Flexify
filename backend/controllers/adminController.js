// backend/controllers/adminController.js
// SUPERADMIN controller — full platform management
import Vehicle from "../models/Vehicle.js";
import Booking from "../models/booking.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import Payment from "../models/Payment.js";
import { logAdminAction } from "../utils/auditLogger.js";


/**
 * Dashboard stats
 */
export const getAdminStats = async (req, res) => {
  try {
    const { district, timeRange } = req.query;

    // 1. Build common filters
    let timeMatch = {};
    if (timeRange && timeRange !== "all") {
      const days = timeRange === "7d" ? 7 : timeRange === "90d" ? 90 : 30;
      timeMatch = { createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } };
    }

    // 2. Aggregate Bookings (Filtered by district via join)
    const bookingAggregation = [
      { $match: timeMatch },
      {
        $lookup: {
          from: "vehicles",
          localField: "vehicle",
          foreignField: "_id",
          as: "vehicleInfo"
        }
      },
      { $unwind: "$vehicleInfo" }
    ];

    if (district && district !== "All Sri Lanka") {
      bookingAggregation.push({ $match: { "vehicleInfo.district": district } });
    }

    bookingAggregation.push({
      $facet: {
        counts: [
          { $group: { _id: "$status", count: { $sum: 1 } } }
        ],
        earnings: [
          { $match: { status: "CONFIRMED" } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ],
        successRate: [
          {
            $group: {
              _id: null,
              confirmed: { $sum: { $cond: [{ $eq: ["$status", "CONFIRMED"] }, 1, 0] } },
              total: { $sum: { $cond: [{ $ne: ["$status", "CANCELLED"] }, 1, 0] } } // Ignore cancelled for success rate
            }
          }
        ],
        byDistrict: [
          { $group: { _id: "$vehicleInfo.district", count: { $sum: 1 } } }
        ]
      }
    });

    const bookingStats = await Booking.aggregate(bookingAggregation);
    const bookings = bookingStats[0];

    // 3. Aggregate Vehicles
    const vehicleMatch = { ...timeMatch };
    if (district && district !== "All Sri Lanka") {
      vehicleMatch.district = district;
    }

    const vehicleStats = await Vehicle.aggregate([
      { $match: vehicleMatch },
      {
        $facet: {
          counts: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          popularTypes: [
            { $group: { _id: "$make", count: { $sum: 1 } } }, // Simple grouping by make as placeholder for 'type'
            { $sort: { count: -1 } },
            { $limit: 10 }
          ]
        }
      }
    ]);
    const vehicleInfo = vehicleStats[0];

    // 4. General Stats (always unfiltered for context)
    const totalUsers = await User.countDocuments();
    const pendingKyc = await User.countDocuments({ verificationStatus: "pending" });

    // Format response
    const confirmedCount = bookings.counts.find(c => c._id === "CONFIRMED")?.count || 0;
    const pendingCount = bookings.counts.find(c => c._id === "PENDING")?.count || 0;
    const totalBookingsCount = bookings.counts.reduce((acc, curr) => acc + curr.count, 0);

    const successData = bookings.successRate[0] || { confirmed: 0, total: 0 };
    const successRate = successData.total > 0 ? ((successData.confirmed / successData.total) * 100).toFixed(1) : 0;

    const districtBreakdown = {};
    bookings.byDistrict.forEach(d => {
      if (d._id) districtBreakdown[d._id] = d.count;
    });

    const types = {};
    vehicleInfo.popularTypes.forEach(t => {
      types[t._id] = t.count;
    });

    res.json({
      totalUsers,
      pendingKyc,
      totalVehicles: vehicleInfo.counts.reduce((acc, curr) => acc + curr.count, 0),
      activeVehicles: vehicleInfo.counts.find(c => c._id === "active")?.count || 0,
      pendingVehicles: vehicleInfo.counts.find(c => c._id === "pending")?.count || 0,
      totalEarnings: bookings.earnings[0]?.total || 0,
      bookings: {
        total: totalBookingsCount,
        confirmed: confirmedCount,
        pending: pendingCount,
        byDistrict: districtBreakdown
      },
      popularTypes: types,
      successRate: parseFloat(successRate)
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

    // Subadmins and superadmins are auto KYC verified + free enterprise subscription
    if (role === "subadmin" || role === "superadmin") {
      user.isKycVerified = true;
      user.verificationStatus = "approved";
      // Grant free enterprise subscription (unlimited vehicle listings, no expiry)
      user.subscription = {
        tier: "ENTERPRISE",
        status: "active",
        startDate: new Date(),
        endDate: null, // Never expires for staff
        gracePeriodEnd: null,
      };
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
 * Update basic user info (superadmin)
 */
export const updateUserInfo = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone;

    await user.save();
    
    logAdminAction(req, "user_info_update", user._id, { name, email, phone });
    res.json({ message: "User details updated", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Ban/Unban user (superadmin)
 */
export const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot ban yourself" });
    }

    const validStatuses = ["active", "blocked", "deleted"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const oldStatus = user.status;
    user.status = status;
    await user.save();

    logAdminAction(req, "user_status_change", user._id, { oldStatus, newStatus: status });
    res.json({ message: `User status set to ${status}`, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get user KYC documents (superadmin)
 */
export const getUserKyc = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("name phone documents verificationStatus isKycVerified rejectionReason rejectionComment");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
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

/**
 * Update user subscription (superadmin manual update)
 */
export const updateUserSubscription = async (req, res) => {
  try {
    const { tier, status, endDate } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const oldSub = { ...user.subscription };
    
    if (tier) user.subscription.tier = tier;
    if (status) user.subscription.status = status;
    if (endDate !== undefined) user.subscription.endDate = endDate;
    
    // Auto-update status to active if an end date in the future is set manually
    if (endDate && new Date(endDate) > new Date() && user.subscription.status === 'expired') {
      user.subscription.status = 'active';
    }
    
    await user.save();

    // AUDIT LOG
    logAdminAction(req, "subscription_update", user._id, {
      oldSubscription: oldSub,
      newSubscription: {
        tier: user.subscription.tier,
        status: user.subscription.status,
        endDate: user.subscription.endDate
      }
    });

    res.json({ message: "User subscription updated", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Superadmin: Get all pending subscription payments
 */
export const getPendingPayments = async (req, res) => {
    try {
        const payments = await Payment.find({ status: "pending" })
            .populate("user", "name email")
            .sort({ createdAt: -1 });
        res.json(payments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Superadmin: Approve or Reject a payment
 */
export const verifyPayment = async (req, res) => {
    try {
        const { paymentId, status, rejectionReason } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const payment = await Payment.findById(paymentId).populate("user");
        if (!payment) return res.status(404).json({ message: "Payment not found" });

        if (payment.status !== "pending") {
            return res.status(400).json({ message: "Payment already processed" });
        }

        payment.status = status;
        if (rejectionReason) payment.rejectionReason = rejectionReason;
        await payment.save();

        if (status === "approved") {
            const user = payment.user;
            const now = new Date();
            
            // Calculate new end date
            let currentEndDate = user.subscription.endDate && user.subscription.endDate > now 
                ? new Date(user.subscription.endDate) 
                : now;
            
            if (payment.duration === "MONTHLY") {
                currentEndDate.setMonth(currentEndDate.getMonth() + 1);
            } else if (payment.duration === "BI_ANNUAL") {
                currentEndDate.setMonth(currentEndDate.getMonth() + 6);
            }

            user.subscription.tier = payment.tier;
            user.subscription.status = "active";
            user.subscription.endDate = currentEndDate;
            
            // Set grace period (5 days after end date)
            const graceDate = new Date(currentEndDate);
            graceDate.setDate(graceDate.getDate() + 5);
            user.subscription.gracePeriodEnd = graceDate;

            await user.save();

            // Notify user (Optional: implementation in notifier.js)
            // sendPaymentConfirmationEmail(user, payment);
        }

        logAdminAction(req, "payment_verification", payment._id, { status, tier: payment.tier });

        res.json({ message: `Payment ${status} successfully`, payment });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};



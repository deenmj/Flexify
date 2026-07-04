// backend/controllers/adminController.js
// SUPERADMIN controller — full platform management
import Vehicle from "../models/Vehicle.js";
import Booking from "../models/booking.js";
import User from "../models/User.js";
import Staff from "../models/Staff.js";
import AuditLog from "../models/AuditLog.js";
import Payment from "../models/Payment.js";
import { logAdminAction } from "../utils/auditLogger.js";
import { sendKycResetEmail } from "../utils/notifier.js";


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

    // 5. Platform Revenue from Subscriptions
    const paymentMatch = { status: "approved", ...timeMatch };
    const platformRevenue = await Payment.aggregate([
      { $match: paymentMatch },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalPlatformRevenue = platformRevenue[0]?.total || 0;

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
      totalEarnings: totalPlatformRevenue,
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
    const users = await User.find().select("-password").lean();
    const staff = await Staff.find().select("-password").lean();
    
    // Combine them, preferring staff over user if email matches
    const staffEmails = new Set(staff.map(s => s.email.toLowerCase()));
    const filteredUsers = users.filter(u => !staffEmails.has(u.email.toLowerCase()));
    
    const combined = [...filteredUsers, ...staff];
    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(combined);
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
    let user = await Staff.findById(req.params.id);
    if (!user) user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent non-superadmins from modifying other admins or superadmins
    if ((user.role === "admin" || user.role === "superadmin") && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only superadmins can modify admin or superadmin roles" });
    }

    // Prevent non-superadmins from assigning the admin role
    if (role === "admin" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only superadmins can assign the admin role" });
    }

    // Prevent superadmin from demoting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot change your own role" });
    }

    const validRoles = ["user", "owner", "staff", "admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role. Cannot promote to superadmin." });
    }

    const oldRole = user.role;
    user.role = role;

    // Set ownerType if promoting to owner
    if (role === "owner") {
      user.ownerType = ownerType === "VERIFIED" ? "VERIFIED" : "UNVERIFIED";
    } else {
      user.ownerType = null;
    }

    // Staff and Admins are auto KYC verified + free PRO subscription
    if (role === "staff" || role === "admin") {
      user.isKycVerified = true;
      user.verificationStatus = "approved";
      // Grant free PRO subscription (unlimited vehicle listings, no expiry)
      user.subscription = {
        tier: "PRO",
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
 * Update basic user info (superadmin)
 */
export const updateUserInfo = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    let user = await Staff.findById(req.params.id).select("-password");
    if (!user) user = await User.findById(req.params.id).select("-password");
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
    let user = await Staff.findById(req.params.id).select("-password");
    if (!user) user = await User.findById(req.params.id).select("-password");
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

    // Cascading logic: If user is blocked, deactivate their vehicles and cancel active bookings
    if (status === "blocked") {
      const Vehicle = (await import("../models/Vehicle.js")).default;
      const Booking = (await import("../models/booking.js")).default;
      
      // Hide all listings
      await Vehicle.updateMany({ owner: user._id }, { isActive: false });
      
      // Cancel all active/pending bookings (both as owner and renter)
      await Booking.updateMany(
        { 
          $or: [{ owner: user._id }, { user: user._id }], 
          status: { $in: ["PENDING", "CONFIRMED"] } 
        },
        { 
          status: "CANCELLED", 
          cancellationReason: "Account associated with this booking has been suspended." 
        }
      );
    }

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
    let user = await Staff.findById(req.params.id)
      .select("-password")
      .populate("vehicles");
      
    if (!user) {
      user = await User.findById(req.params.id)
        .select("-password")
        .populate("vehicles");
    }
    
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Delete user KYC documents (superadmin)
 */
export const deleteUserKyc = async (req, res) => {
  try {
    let user = await Staff.findById(req.params.id);
    if (!user) user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.documents = { idNumber: "", license: "", selfie: "", address: "" };
    user.verificationStatus = "not_submitted";
    user.isKycVerified = false;
    
    // Demote to UNVERIFIED if owner
    if (user.role === "owner" && user.ownerType === "VERIFIED") {
      user.ownerType = "UNVERIFIED";
    }

    await user.save();
    
    // FIRE-AND-FORGET: Log action and send notification email to user
    const reason = req.body.reason || "Admin enforced verification data reset";
    logAdminAction(req, "kyc_delete", user._id, { reason });
    sendKycResetEmail(user, reason).catch(err => console.error("KYC reset email failed:", err.message));
    
    res.json({ message: "User KYC data cleared", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get ALL vehicles (superadmin)
 */
export const getAllVehicles = async (req, res) => {
  try {
    let vehicles = await Vehicle.find()
      .populate("owner", "name email role ownerType profilePic")
      .sort({ createdAt: -1 });

    let healed = false;
    for (let v of vehicles) {
      if (!v.owner) {
        const rawV = await Vehicle.findById(v._id).lean();
        if (rawV && rawV.owner) {
          const staff = await Staff.findById(rawV.owner);
          if (staff) {
            v.ownerModel = 'Staff';
            await v.save();
            healed = true;
          }
        }
      }
    }

    if (healed) {
      vehicles = await Vehicle.find()
        .populate("owner", "name email role ownerType profilePic")
        .sort({ createdAt: -1 });
    }

    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Superadmin: Delete or Suspend Vehicle
 */
export const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    // Cancel all pending or confirmed bookings for this vehicle
    await Booking.updateMany(
      { vehicle: vehicle._id, status: { $in: ["PENDING", "CONFIRMED"] } },
      { $set: { status: "CANCELLED" } }
    );

    const vehicleInfo = { title: vehicle.title, make: vehicle.make, model: vehicle.model };
    await vehicle.deleteOne();

    logAdminAction(req, "vehicle_delete", vehicle._id, { vehicleInfo });
    res.json({ message: "Vehicle deleted successfully" });
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
 * Superadmin: Force Cancel Booking
 */
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
      return res.status(400).json({ message: `Cannot cancel a booking that is already ${booking.status}` });
    }

    const oldStatus = booking.status;
    booking.status = "CANCELLED";
    await booking.save();

    logAdminAction(req, "booking_cancel", booking._id, { oldStatus, reason: req.body.reason || "Admin Intervention" });
    res.json({ message: "Booking cancelled successfully", booking });
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
    let user = await Staff.findById(req.params.id);
    if (!user) user = await User.findById(req.params.id);
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



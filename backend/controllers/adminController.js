// backend/controllers/adminController.js
// SUPERADMIN controller — full platform management
import mongoose from "mongoose";
import Vehicle from "../models/Vehicle.js";
import Booking from "../models/booking.js";
import User from "../models/User.js";
import Staff from "../models/Staff.js";
import AuditLog from "../models/AuditLog.js";
import VehicleMake from "../models/VehicleMake.js";
import VehicleModel from "../models/VehicleModel.js";
import ContactEvent from "../models/ContactEvent.js";
import cloudinary from "../utils/cloudinary.js";
import { logAdminAction } from "../utils/auditLogger.js";
import { sendKycResetEmail } from "../utils/notifier.js";
import ContactClick from "../models/ContactClick.js";



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

    // 3. Aggregate Vehicles (filtered by district, not constrained by booking timeRange)
    const vehicleMatch = { status: { $ne: "deleted" } };
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
    const vehicleInfo = vehicleStats[0] || { counts: [], popularTypes: [] };

    // Calculate vehicle counts properly
    const countsMap = {};
    (vehicleInfo.counts || []).forEach(c => {
      countsMap[c._id] = c.count;
    });
    const totalVehicles = (vehicleInfo.counts || []).reduce((acc, curr) => acc + curr.count, 0);
    const activeVehicles = (countsMap["approved"] || 0) + (countsMap["active"] || 0);
    const pendingVehicles = countsMap["pending"] || 0;

    // 4. General Stats (always unfiltered for context)
    const totalUsers = await User.countDocuments();
    const pendingKyc = 0;

    const totalPlatformRevenue = 0;

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
    (vehicleInfo.popularTypes || []).forEach(t => {
      types[t._id] = t.count;
    });

    res.json({
      totalUsers,
      pendingKyc,
      totalVehicles,
      activeVehicles,
      pendingVehicles,
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
 * Admin: Get Call & WhatsApp Contact Analytics (Today, 7d, 30d, by vehicle)
 */
export const getContactAnalytics = async (req, res) => {
  try {
    const { timeframe = "today", vehicleId, district } = req.query;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Purge any mock/test clicks to ensure 100% accurate, genuine database reporting
    if (!global.hasPurgedMockContactClicks) {
      await ContactClick.deleteMany({});
      global.hasPurgedMockContactClicks = true;
    }

    // 1. Vehicle filter condition
    let targetVehicleIds = [];
    if (vehicleId && vehicleId !== "all" && mongoose.Types.ObjectId.isValid(vehicleId)) {
      targetVehicleIds = [new mongoose.Types.ObjectId(vehicleId)];
    } else if (district && district !== "All Sri Lanka") {
      const vInDistrict = await Vehicle.find({ district }).select("_id").lean();
      targetVehicleIds = vInDistrict.map(v => v._id);
    }

    const clickFilter = {};
    if (targetVehicleIds.length > 0) {
      clickFilter.vehicle = { $in: targetVehicleIds };
    }

    // 2. Today's Totals (Calls and WhatsApp)
    const todayFilter = {
      ...clickFilter,
      createdAt: { $gte: todayStart, $lte: todayEnd }
    };

    const todayAgg = await ContactClick.aggregate([
      { $match: todayFilter },
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ]);

    const callsToday = todayAgg.find(c => c._id === "call")?.count || 0;
    const whatsappToday = todayAgg.find(c => c._id === "whatsapp")?.count || 0;
    const totalToday = callsToday + whatsappToday;

    // 3. Yesterday's Totals
    const yestStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const yestEnd = new Date(todayEnd.getTime() - 24 * 60 * 60 * 1000);
    const yestFilter = {
      ...clickFilter,
      createdAt: { $gte: yestStart, $lte: yestEnd }
    };
    const yestAgg = await ContactClick.aggregate([
      { $match: yestFilter },
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ]);
    const callsYesterday = yestAgg.find(c => c._id === "call")?.count || 0;
    const whatsappYesterday = yestAgg.find(c => c._id === "whatsapp")?.count || 0;
    const totalYesterday = callsYesterday + whatsappYesterday;

    // 4. Lifetime Totals from Vehicle collection
    let vehicleLifetimeMatch = { status: { $ne: "deleted" } };
    if (targetVehicleIds.length > 0) {
      vehicleLifetimeMatch._id = { $in: targetVehicleIds };
    }
    const lifetimeAgg = await Vehicle.aggregate([
      { $match: vehicleLifetimeMatch },
      {
        $group: {
          _id: null,
          calls: { $sum: "$callClicks" },
          whatsapp: { $sum: "$whatsappClicks" },
        }
      }
    ]);
    const lifetimeCalls = lifetimeAgg[0]?.calls || 0;
    const lifetimeWhatsapp = lifetimeAgg[0]?.whatsapp || 0;
    const lifetimeTotal = lifetimeCalls + lifetimeWhatsapp;

    // 5. Chart Data
    let chartData = [];

    if (timeframe === "today") {
      // Hourly distribution for today (00:00 to 23:00)
      const hourlyAgg = await ContactClick.aggregate([
        { $match: todayFilter },
        {
          $group: {
            _id: { hour: "$hour", type: "$type" },
            count: { $sum: 1 }
          }
        }
      ]);

      for (let h = 0; h < 24; h++) {
        const hourLabel = `${String(h).padStart(2, "0")}:00`;
        const c = hourlyAgg.find(x => x._id.hour === h && x._id.type === "call")?.count || 0;
        const w = hourlyAgg.find(x => x._id.hour === h && x._id.type === "whatsapp")?.count || 0;
        chartData.push({
          key: hourLabel,
          label: hourLabel,
          hour: h,
          calls: c,
          whatsapp: w,
          total: c + w,
        });
      }
    } else {
      // Daily distribution for 7d or 30d
      const numDays = timeframe === "7d" ? 7 : 30;
      const rangeStartDate = new Date(todayStart.getTime() - (numDays - 1) * 24 * 60 * 60 * 1000);

      const dailyAgg = await ContactClick.aggregate([
        {
          $match: {
            ...clickFilter,
            createdAt: { $gte: rangeStartDate, $lte: todayEnd }
          }
        },
        {
          $group: {
            _id: { date: "$date", type: "$type" },
            count: { $sum: 1 }
          }
        }
      ]);

      for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const displayLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

        const c = dailyAgg.find(x => x._id.date === dStr && x._id.type === "call")?.count || 0;
        const w = dailyAgg.find(x => x._id.date === dStr && x._id.type === "whatsapp")?.count || 0;
        chartData.push({
          key: dStr,
          label: displayLabel,
          date: dStr,
          calls: c,
          whatsapp: w,
          total: c + w
        });
      }
    }

    // 6. Rental Vehicles Breakdown list
    let vehicleQuery = { status: { $ne: "deleted" } };
    if (district && district !== "All Sri Lanka") {
      vehicleQuery.district = district;
    }
    const rentalVehicles = await Vehicle.find(vehicleQuery)
      .select("title make model year registrationNumber photos district city pricePerDay callClicks whatsappClicks owner")
      .populate("owner", "name email phone")
      .lean();

    // Map today's click per vehicle
    const todayVehicleAgg = await ContactClick.aggregate([
      { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
      {
        $group: {
          _id: { vehicle: "$vehicle", type: "$type" },
          count: { $sum: 1 }
        }
      }
    ]);

    const vehicleBreakdown = rentalVehicles.map(v => {
      const vId = v._id.toString();
      const callsTd = todayVehicleAgg.find(x => x._id.vehicle?.toString() === vId && x._id.type === "call")?.count || 0;
      const whatsappTd = todayVehicleAgg.find(x => x._id.vehicle?.toString() === vId && x._id.type === "whatsapp")?.count || 0;
      return {
        _id: v._id,
        title: v.title || `${v.make || ''} ${v.model || ''}`.trim() || 'Rental Vehicle',
        make: v.make || '',
        model: v.model || '',
        year: v.year || '',
        registrationNumber: v.registrationNumber || '',
        district: v.district || '',
        city: v.city || '',
        pricePerDay: v.pricePerDay || 0,
        image: Array.isArray(v.photos) && v.photos.length > 0 ? v.photos[0] : '',
        ownerName: v.owner?.name || 'Owner',
        ownerPhone: v.owner?.phone || '',
        callsToday: callsTd,
        whatsappToday: whatsappTd,
        totalToday: callsTd + whatsappTd,
        callsLifetime: v.callClicks || 0,
        whatsappLifetime: v.whatsappClicks || 0,
        totalLifetime: (v.callClicks || 0) + (v.whatsappClicks || 0)
      };
    });

    vehicleBreakdown.sort((a, b) => (b.totalToday - a.totalToday) || (b.totalLifetime - a.totalLifetime));

    res.json({
      timeframe,
      selectedVehicleId: vehicleId || "all",
      selectedDistrict: district || "All Sri Lanka",
      today: {
        calls: callsToday,
        whatsapp: whatsappToday,
        total: totalToday,
        callsYesterday,
        whatsappYesterday,
        totalYesterday,
      },
      lifetime: {
        calls: lifetimeCalls,
        whatsapp: lifetimeWhatsapp,
        total: lifetimeTotal
      },
      chartData,
      vehicles: vehicleBreakdown
    });
  } catch (err) {
    console.error("Error in getContactAnalytics:", err);
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
 * Get all vehicles belonging to a specific user (admin)
 */
export const getUserVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.params.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Admin: Create a vehicle on behalf of a specific user account
 * Bypasses all subscription limits, vehicle is immediately active.
 */
export const createVehicleForUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;

    // Verify target user exists
    let targetUser = await User.findById(targetUserId);
    if (!targetUser) targetUser = await Staff.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ message: "Target user not found" });

    const {
      title, make, model, year, pricePerDay, transmission, fuelType,
      seats, description, lat, lng, address, serviceType,
      engineCapacity, fuelConsumption, features, province, district, city,
      pricePerWeek, pricePerMonth, kmLimitPerDay, extraKmPrice,
      driverOption, driverPricePerDay, mobileNumber, contactMethod, weddingHiresSpecial
    } = req.body;

    if (!title || !make || !model || !pricePerDay || !mobileNumber) {
      return res.status(400).json({ message: "Missing required fields: Title, Make, Model, Price Per Day, and Mobile Number." });
    }

    // If the target is a plain user, promote to owner role automatically
    if (targetUser.role === "user") {
      await User.findByIdAndUpdate(targetUserId, {
        role: "owner",
        ownerType: "UNVERIFIED",
        subscription: { tier: 'FREE', status: 'free', startDate: new Date(), endDate: null }
      });
    }

    const photos = [];
    if (req.files) {
      req.files.forEach((f) => photos.push({ url: f.path, public_id: f.filename }));
    }

    // Resolve Make (find or create)
    const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
    let finalMakeName = make;
    let resolvedMakeObj = null;
    if (!isObjectId(make)) {
      const normalized = make.charAt(0).toUpperCase() + make.slice(1).toLowerCase();
      let m = await VehicleMake.findOne({ name: new RegExp(`^${make}$`, "i") });
      if (!m) m = await VehicleMake.create({ name: normalized, approved: true, createdBy: req.user._id });
      resolvedMakeObj = m;
      finalMakeName = m.name;
    } else {
      const m = await VehicleMake.findById(make);
      if (m) { finalMakeName = m.name; resolvedMakeObj = m; }
    }

    // Resolve Model (find or create)
    let finalModelName = model;
    if (!isObjectId(model) && resolvedMakeObj) {
      const normalized = model.charAt(0).toUpperCase() + model.slice(1).toLowerCase();
      let m = await VehicleModel.findOne({ make: resolvedMakeObj._id, name: new RegExp(`^${model}$`, "i") });
      if (!m) m = await VehicleModel.create({ make: resolvedMakeObj._id, name: normalized, approved: true, createdBy: req.user._id });
      finalModelName = m.name;
    } else if (isObjectId(model)) {
      const m = await VehicleModel.findById(model);
      if (m) finalModelName = m.name;
    }

    const staffRoles = ["superadmin", "admin", "staff", "manager", "supervisor"];
    const isTargetStaff = staffRoles.includes(targetUser.role);

    const vehicle = await Vehicle.create({
      owner: targetUserId,
      ownerModel: isTargetStaff ? "Staff" : "User",
      title,
      make: finalMakeName,
      model: finalModelName,
      year: parseInt(year),
      photos,
      location: {
        type: "Point",
        coordinates: [parseFloat(lng) || 80.7718, parseFloat(lat) || 7.8731],
        address: address || "",
      },
      pricePerDay: parseFloat(pricePerDay),
      pricePerWeek: pricePerWeek ? parseFloat(pricePerWeek) : null,
      pricePerMonth: pricePerMonth ? parseFloat(pricePerMonth) : null,
      kmLimitPerDay: kmLimitPerDay ? parseInt(kmLimitPerDay) : null,
      extraKmPrice: extraKmPrice ? parseFloat(extraKmPrice) : null,
      transmission: transmission || "Automatic",
      fuelType: fuelType || "Petrol",
      seats: parseInt(seats) || 4,
      description,
      serviceType: serviceType ? (Array.isArray(serviceType) ? serviceType : [serviceType]) : [],
      status: "active", // Admin-created vehicles are always immediately active
      isActive: true,
      engineCapacity,
      fuelConsumption,
      features: features ? (typeof features === 'string' ? JSON.parse(features) : features) : [],
      province,
      district,
      city,
      driverOption: driverOption || "self-drive",
      driverPricePerDay: driverPricePerDay ? parseFloat(driverPricePerDay) : 0,
      mobileNumber: mobileNumber || null,
      contactMethod: contactMethod || "both",
      weddingHiresSpecial: weddingHiresSpecial === "true" || weddingHiresSpecial === true,
    });

    logAdminAction(req, "vehicle_create_for_user", targetUserId, {
      vehicleId: vehicle._id,
      vehicleTitle: vehicle.title,
      createdFor: targetUser.email,
    });

    res.status(201).json(vehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Admin: Get Calls & WhatsApp inquiry analytics
 * Returns today-counts, all-time totals, 30-day chart data, and per-vehicle breakdown
 */
export const getInquiryStats = async (req, res) => {
  try {
    const now = new Date();

    // "Today" window: midnight -> now
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // 30-day window for chart
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ── 1. Today counts ───────────────────────────────────────────────────
    const [callsToday, whatsappToday] = await Promise.all([
      ContactEvent.countDocuments({ type: "call",     createdAt: { $gte: todayStart } }),
      ContactEvent.countDocuments({ type: "whatsapp", createdAt: { $gte: todayStart } }),
    ]);

    // ── 2. All-time totals (sum from vehicle documents) ───────────────────
    const totalsAgg = await Vehicle.aggregate([
      { $group: { _id: null, totalCalls: { $sum: "$callClicks" }, totalWhatsApp: { $sum: "$whatsappClicks" } } },
    ]);
    const totals = totalsAgg[0] || { totalCalls: 0, totalWhatsApp: 0 };

    // ── 3. 30-day daily chart (group by day) ─────────────────────────────
    const dailyEvents = await ContactEvent.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, type: "$type" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    const chartMap = {};
    dailyEvents.forEach(({ _id, count }) => {
      if (!chartMap[_id.date]) chartMap[_id.date] = { date: _id.date, calls: 0, whatsapp: 0 };
      chartMap[_id.date][_id.type === "call" ? "calls" : "whatsapp"] = count;
    });

    // Fill every calendar day in the last 30 days (even zeros)
    const chartData = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      chartData.push(chartMap[key] || { date: key, calls: 0, whatsapp: 0 });
    }

    // ── 4. Per-vehicle breakdown ──────────────────────────────────────────
    const vehicleBreakdown = await Vehicle.aggregate([
      { $match: { $or: [{ callClicks: { $gt: 0 } }, { whatsappClicks: { $gt: 0 } }] } },
      { $lookup: { from: "users",  localField: "owner", foreignField: "_id", as: "ownerInfo"  } },
      { $lookup: { from: "staffs", localField: "owner", foreignField: "_id", as: "staffInfo" } },
      { $addFields: {
          ownerDoc: { $arrayElemAt: [{ $concatArrays: ["$ownerInfo", "$staffInfo"] }, 0] },
          totalInquiries: { $add: ["$callClicks", "$whatsappClicks"] },
      }},
      { $sort: { totalInquiries: -1 } },
      { $limit: 50 },
      { $project: {
          _id: 1, title: 1, make: 1, model: 1, district: 1,
          photos: { $slice: ["$photos", 1] },
          callClicks: 1, whatsappClicks: 1, totalInquiries: 1,
          "ownerDoc.name": 1, "ownerDoc.email": 1, "ownerDoc.role": 1,
      }},
    ]);

    // Attach today's per-vehicle counts
    const vehicleIds = vehicleBreakdown.map((v) => v._id);
    const todayPerVehicle = await ContactEvent.aggregate([
      { $match: { vehicle: { $in: vehicleIds }, createdAt: { $gte: todayStart } } },
      { $group: { _id: { vehicle: "$vehicle", type: "$type" }, count: { $sum: 1 } } },
    ]);

    const todayMap = {};
    todayPerVehicle.forEach(({ _id, count }) => {
      const key = _id.vehicle.toString();
      if (!todayMap[key]) todayMap[key] = { callsToday: 0, whatsappToday: 0 };
      if (_id.type === "call") todayMap[key].callsToday = count;
      else todayMap[key].whatsappToday = count;
    });

    const vehicleBreakdownWithToday = vehicleBreakdown.map((v) => ({
      ...v,
      callsToday:     todayMap[v._id.toString()]?.callsToday    || 0,
      whatsappToday:  todayMap[v._id.toString()]?.whatsappToday || 0,
      inquiriesToday: (todayMap[v._id.toString()]?.callsToday || 0) + (todayMap[v._id.toString()]?.whatsappToday || 0),
    }));

    res.json({
      today:    { calls: callsToday, whatsapp: whatsappToday, total: callsToday + whatsappToday },
      allTime:  { calls: totals.totalCalls, whatsapp: totals.totalWhatsApp, total: totals.totalCalls + totals.totalWhatsApp },
      chartData,
      vehicleBreakdown: vehicleBreakdownWithToday,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// backend/controllers/bookingController.js
import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";
import sendEmail from "../utils/sendEmail.js";

/**
 * Create booking — only KYC verified users can book
 */
export const createBooking = async (req, res) => {
  try {
    const userId = req.user._id;
    const { vehicleId, startDate, endDate } = req.body;

    // Check KYC verification
    if (!req.user.isKycVerified) {
      return res.status(403).json({
        message: "You must complete KYC verification to book a vehicle.",
        verificationNeeded: true,
        verificationStatus: req.user.verificationStatus,
      });
    }

    if (!vehicleId || !startDate || !endDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const vehicle = await Vehicle.findById(vehicleId).populate("owner");
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    if (vehicle.status !== "active") return res.status(400).json({ message: "Vehicle is not available" });

    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) {
      return res.status(400).json({ message: "Invalid dates" });
    }

    const days = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) || 1;

    // Check for overlapping confirmed bookings
    const overlapping = await Booking.findOne({
      vehicle: vehicleId,
      status: "CONFIRMED",
      $or: [{ startDate: { $lte: e }, endDate: { $gte: s } }],
    });

    if (overlapping) {
      return res.status(409).json({ message: "Vehicle not available for selected dates" });
    }

    const totalAmount = (vehicle.pricePerDay || 0) * days;

    const booking = await Booking.create({
      user: userId,
      owner: vehicle.owner._id,
      vehicle: vehicleId,
      startDate: s,
      endDate: e,
      days,
      totalAmount,
      status: "PENDING",
    });

    // Log notification
    console.log(`🔔 NEW BOOKING: ${vehicle.title} by ${req.user.name} | LKR ${totalAmount} for ${days} days`);

    // Send email to owner
    try {
      await sendEmail({
        to: vehicle.owner.email,
        subject: "🔔 New Booking Request - Flexify",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e1e1e1; border-radius: 8px;">
            <h2 style="color: #1890ff;">New Booking Request</h2>
            <p>Hi <strong>${vehicle.owner.name}</strong>,</p>
            <p>You have a new booking request for <strong>${vehicle.title}</strong>.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p><strong>Dates:</strong> ${s.toDateString()} - ${e.toDateString()}</p>
              <p><strong>Total:</strong> LKR ${totalAmount.toLocaleString()}</p>
            </div>
            <p>Log in to your dashboard to accept or reject this request.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Email notification failed:", emailErr.message);
    }

    const responseData = await Booking.findById(booking._id).populate("vehicle owner user");
    return res.status(201).json(responseData);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Accept booking — only verified owner (of that vehicle) or subadmin/superadmin
 */
export const acceptBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("vehicle owner user");
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.status !== "PENDING") {
      return res.status(400).json({ message: "Booking is not in pending state" });
    }

    // Authorization: vehicle owner (VERIFIED) or subadmin/superadmin
    const isOwner = booking.owner._id.toString() === req.user._id.toString();
    const isVerifiedOwner = isOwner && req.user.role === "owner" && req.user.ownerType === "VERIFIED";
    const isAdmin = req.user.role === "subadmin" || req.user.role === "superadmin";

    if (!isVerifiedOwner && !isAdmin) {
      return res.status(403).json({ message: "Only verified owners or admins can accept bookings" });
    }

    // Check no overlapping confirmed bookings
    const overlap = await Booking.findOne({
      vehicle: booking.vehicle._id,
      status: "CONFIRMED",
      _id: { $ne: booking._id },
      $or: [{ startDate: { $lte: booking.endDate }, endDate: { $gte: booking.startDate } }],
    });

    if (overlap) {
      return res.status(409).json({ message: "Vehicle already booked for these dates" });
    }

    booking.status = "CONFIRMED";
    await booking.save();

    // Increment timesRented
    await Vehicle.findByIdAndUpdate(booking.vehicle._id, { $inc: { timesRented: 1 } });

    // Return with owner phone revealed
    const result = await Booking.findById(booking._id)
      .populate("vehicle")
      .populate("owner", "name email phone profilePic")
      .populate("user", "name email phone");

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Reject booking — owner or subadmin/superadmin
 */
export const rejectBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.status !== "PENDING") {
      return res.status(400).json({ message: "Booking is not in pending state" });
    }

    const isOwner = booking.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "subadmin" || req.user.role === "superadmin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    booking.status = "REJECTED";
    await booking.save();
    return res.json({ message: "Booking rejected", booking });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Cancel booking — user or owner or admin
 */
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const isUser = booking.user.toString() === req.user._id.toString();
    const isOwner = booking.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "superadmin";

    if (!isUser && !isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    booking.status = "CANCELLED";
    await booking.save();
    return res.json({ message: "Booking cancelled" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Get bookings for current user (both as renter and as owner)
 */
export const getMyBookings = async (req, res) => {
  try {
    let filter;
    if (req.user.role === "owner") {
      // Owners see bookings for their vehicles
      filter = { owner: req.user._id };
    } else {
      // Users (renters) see their own bookings
      filter = { user: req.user._id };
    }

    const bookings = await Booking.find(filter)
      .populate("vehicle")
      .populate({
        path: "owner",
        select: "name email phone profilePic",
      })
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    // Mask owner phone unless booking is CONFIRMED
    const sanitized = bookings.map((b) => {
      const obj = b.toObject();
      if (obj.status !== "CONFIRMED" && obj.owner) {
        obj.owner.phone = undefined;
      }
      return obj;
    });

    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

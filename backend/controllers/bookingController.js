// backend/controllers/bookingController.js
import Booking from "../models/booking.js";
import Vehicle from "../models/Vehicle.js";
import Blackout from "../models/Blackout.js";
import sendEmail from "../utils/sendEmail.js";
import { sendBookingUpdateEmail, sendNewBookingEmail } from "../utils/notifier.js";
import { createNotification } from "./notificationController.js";

/**
 * Create booking — users who have uploaded KYC documents can book
 * (No staff approval needed — documents are reviewed post-submission)
 */
export const createBooking = async (req, res) => {
  try {
    const userId = req.user._id;
    const { vehicleId, startDate, endDate } = req.body;

    // Check KYC documents uploaded (no staff approval needed — just must have submitted)
    const isStaffOrAdmin = req.user.role === "subadmin" || req.user.role === "superadmin";
    if (!isStaffOrAdmin && req.user.verificationStatus === "not_submitted") {
      return res.status(403).json({
        message: "Please upload your KYC documents before booking a vehicle.",
        verificationNeeded: true,
        verificationStatus: req.user.verificationStatus,
      });
    }

    if (!vehicleId || !startDate || !endDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const vehicle = await Vehicle.findById(vehicleId).populate("owner", "_id name email phone profilePic notificationEmail isNotificationEmailActive");
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    if (vehicle.status !== "active") return res.status(400).json({ message: "Vehicle is not available" });

    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) {
      return res.status(400).json({ message: "Invalid dates" });
    }

    const days = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) || 1;

    // Run overlap checks in PARALLEL for speed
    const [overlapping, overlappingBlackout] = await Promise.all([
      Booking.findOne({
        vehicle: vehicleId,
        status: "CONFIRMED",
        $or: [{ startDate: { $lte: e }, endDate: { $gte: s } }],
      }).lean(),
      Blackout.findOne({
        vehicle: vehicleId,
        $or: [{ startDate: { $lte: e }, endDate: { $gte: s } }],
      }).lean()
    ]);

    if (overlapping) {
      return res.status(409).json({ message: "Vehicle not available for selected dates (Already booked)" });
    }
    if (overlappingBlackout) {
      return res.status(409).json({ message: "Vehicle not available for selected dates (Owner unavailable)" });
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

    // Build response immediately from existing data (no re-query)
    const responseData = booking.toObject();
    responseData.vehicle = vehicle;
    responseData.owner = vehicle.owner;
    responseData.user = { _id: req.user._id, name: req.user.name, email: req.user.email, phone: req.user.phone };

    // RETURN RESPONSE IMMEDIATELY — don't wait for email/notifications
    res.status(201).json(responseData);

    // === FIRE-AND-FORGET: notifications & email (after response sent) ===
    console.log(`🔔 NEW BOOKING: ${vehicle.title} by ${req.user.name} | LKR ${totalAmount} for ${days} days`);

    const io = req.app.get("io");
    if (io) {
      io.to(vehicle.owner._id.toString()).emit("newBookingRequest", {
        bookingId: booking._id,
        renterName: req.user.name,
        vehicleTitle: vehicle.title,
        startDate: s,
        endDate: e,
        totalAmount
      });

      // PERSISTENT NOTIFICATION (fire-and-forget)
      createNotification(
        io,
        vehicle.owner._id,
        "New Booking Request",
        `${req.user.name} wants to rent your ${vehicle.title}.`,
        "booking_request",
        booking._id
      ).catch(err => console.error("Notification save failed:", err.message));
    }

    // Send email to owner (fire-and-forget — never blocks response)
    sendNewBookingEmail(vehicle.owner, req.user.name, vehicle.title, s, e, totalAmount);

  } catch (err) {
    // Only send error if headers haven't been sent yet
    if (!res.headersSent) {
      return res.status(500).json({ message: err.message });
    }
    console.error("Post-response error in createBooking:", err.message);
  }
};

/**
 * Accept booking — owner of that vehicle or subadmin/superadmin
 * (No KYC requirement for owners to accept their own bookings)
 */
export const acceptBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("vehicle").populate({
      path: "owner",
      select: "_id name email phone profilePic notificationEmail isNotificationEmailActive"
    }).populate("user");
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.status !== "PENDING") {
      return res.status(400).json({ message: "Booking is not in pending state" });
    }

    // Authorization: vehicle owner (no KYC needed) or subadmin/superadmin
    const isOwner = booking.owner._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "subadmin" || req.user.role === "superadmin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to accept this booking" });
    }

    // Check no overlapping confirmed bookings
    const overlap = await Booking.findOne({
      vehicle: booking.vehicle._id,
      status: "CONFIRMED",
      _id: { $ne: booking._id },
      $or: [{ startDate: { $lte: booking.endDate }, endDate: { $gte: booking.startDate } }],
    }).lean();

    if (overlap) {
      return res.status(409).json({ message: "Vehicle already booked for these dates" });
    }

    booking.status = "CONFIRMED";
    // Save booking and increment timesRented in parallel
    await Promise.all([
      booking.save(),
      Vehicle.findByIdAndUpdate(booking.vehicle._id, { $inc: { timesRented: 1 } })
    ]);

    // Build response from existing populated data (no re-query)
    const result = booking.toObject();
    // Ensure owner phone is visible for confirmed bookings
    if (result.owner && !result.owner.phone) {
      result.owner.phone = booking.owner.phone;
    }

    // RETURN RESPONSE IMMEDIATELY
    res.json(result);

    // === FIRE-AND-FORGET: socket, emails (after response sent) ===
    const io = req.app.get("io");
    if (io) {
      io.to(booking.user._id.toString()).emit("bookingStatusUpdate", {
        bookingId: booking._id,
        status: "CONFIRMED",
        message: `Your booking for ${booking.vehicle.title} has been confirmed!`
      });

      // PERSISTENT NOTIFICATION (fire-and-forget)
      createNotification(
        io,
        booking.user._id,
        "Booking Confirmed",
        `Your booking for ${booking.vehicle.title} has been confirmed!`,
        "booking_update",
        booking._id
      ).catch(err => console.error("Notification save failed:", err.message));
    }

    const renter = booking.user;
    const ownerUser = booking.owner;
    const vehicleTitle = booking.vehicle.title || "Vehicle";
    const sDate = new Date(booking.startDate).toDateString();
    const eDate = new Date(booking.endDate).toDateString();

    // Determine owner recipient email
    const ownerRecipient = (ownerUser.isNotificationEmailActive && ownerUser.notificationEmail) 
      ? ownerUser.notificationEmail 
      : ownerUser.email;

    // Send both emails in parallel (fire-and-forget)
    Promise.all([
      sendEmail({
        to: renter.email,
        subject: "✅ Booking Confirmed - Flexify",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e1e1e1; border-radius: 8px;">
            <h2 style="color: #16a34a;">Booking Confirmed!</h2>
            <p>Hi <strong>${renter.name}</strong>,</p>
            <p>Great news! Your booking for <strong>${vehicleTitle}</strong> has been confirmed.</p>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p><strong>Dates:</strong> ${sDate} - ${eDate}</p>
              <p><strong>Total:</strong> LKR ${booking.totalAmount.toLocaleString()}</p>
              <p><strong>Owner:</strong> ${ownerUser.name}</p>
              ${ownerUser.phone ? `<p><strong>Owner Phone:</strong> ${ownerUser.phone}</p>` : ""}
            </div>
            <p>You can view your booking details in your <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/dashboard" style="color: #1890ff;">dashboard</a>.</p>
          </div>
        `,
      }),
      sendEmail({
        to: ownerRecipient,
        subject: "✅ Booking Accepted - Flexify",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e1e1e1; border-radius: 8px;">
            <h2 style="color: #16a34a;">You Accepted a Booking</h2>
            <p>Hi <strong>${ownerUser.name}</strong>,</p>
            <p>You've confirmed the booking for <strong>${vehicleTitle}</strong>.</p>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p><strong>Dates:</strong> ${sDate} - ${eDate}</p>
              <p><strong>Total:</strong> LKR ${booking.totalAmount.toLocaleString()}</p>
              <p><strong>Renter:</strong> ${renter.name}</p>
              ${renter.phone ? `<p><strong>Renter Phone:</strong> ${renter.phone}</p>` : ""}
            </div>
            <p>Manage your bookings in your <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/dashboard" style="color: #1890ff;">dashboard</a>.</p>
          </div>
        `,
      })
    ]).catch(emailErr => console.error("Confirmation email failed:", emailErr.message));

  } catch (err) {
    if (!res.headersSent) {
      return res.status(500).json({ message: err.message });
    }
    console.error("Post-response error in acceptBooking:", err.message);
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

    // SOCKET NOTIFICATION TO RENTER
    const io = req.app.get("io");
    if (io) {
      io.to(booking.user.toString()).emit("bookingStatusUpdate", {
        bookingId: booking._id,
        status: "REJECTED",
        message: `Your booking for ${booking.vehicle?.title || "a vehicle"} was rejected.`
      });

      // PERSISTENT NOTIFICATION (fire-and-forget)
      createNotification(
        io,
        booking.user,
        "Booking Rejected",
        `The owner has rejected your booking request for ${booking.vehicle?.title || "a vehicle"}.`,
        "booking_update",
        booking._id
      ).catch(err => console.error("Notification save failed:", err.message));
    }

    // Send rejection email async
    await booking.populate([
      { path: "owner", select: "_id name email notificationEmail isNotificationEmailActive" },
      { path: "user" },
      { path: "vehicle" }
    ]);
    if (booking.owner && booking.user && booking.vehicle) {
      sendBookingUpdateEmail(booking.owner, booking.user, booking.vehicle, "REJECTED");
    }

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

    // Send cancellation email async
    await booking.populate([
      { path: "owner", select: "_id name email notificationEmail isNotificationEmailActive" },
      { path: "user" },
      { path: "vehicle" }
    ]);
    if (booking.owner && booking.user && booking.vehicle) {
      sendBookingUpdateEmail(booking.owner, booking.user, booking.vehicle, "CANCELLED");
    }

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
    } else if (req.user.role === "subadmin" || req.user.role === "superadmin") {
      // Staff sees bookings as both owner (their vehicles) AND renter
      filter = { $or: [{ owner: req.user._id }, { user: req.user._id }] };
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
      .populate("user", "-password")
      .sort({ createdAt: -1 });

    // Mask owner phone unless booking is CONFIRMED
    for (const b of bookings) {
      if (b.status !== "CONFIRMED" && b.owner) {
        b.owner.phone = undefined;
      }
    }

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get renter details for an owner (direct fetch from User collection for a specific booking)
 */
export const getRenterDetails = async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Fetch the user directly from the User collection to ensure all fields are accessible
    // exactly like the staff/admin dashboard does.
    const user = await User.findById(booking.user).select("-password");
    if (!user) return res.status(404).json({ message: "Renter not found" });

    // Ensure the requester is the owner of the vehicle or an admin
    const bookingOwnerId = booking.owner._id ? booking.owner._id.toString() : booking.owner.toString();
    const isOwner = bookingOwnerId === req.user._id.toString();
    const isAdmin = req.user.role === "subadmin" || req.user.role === "superadmin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to view these renter details" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

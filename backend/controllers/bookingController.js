// backend/controllers/bookingController.js
import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";
import Earning from "../models/Earning.js";
import mongoose from "mongoose";
import sendEmail from "../utils/sendEmail.js";

/**
 * Helper to check overlapping dates
 */
const isOverlapping = (startA, endA, startB, endB) => {
  return (startA <= endB) && (startB <= endA);
};

export const createBooking = async (req, res) => {
  try {
    const userId = req.user._id;
    const { vehicleId, startDate, endDate } = req.body;

    // Check if user is verified
    if (!req.user.verified) {
      // Check if they have a pending request or rejection
      const status = req.user.verificationRequest?.status || "unverified";
      return res.status(403).json({ 
        message: "You must be verified to book a vehicle.",
        status: status,
        verificationNeeded: true
      });
    }

    if (!vehicleId || !startDate || !endDate) return res.status(400).json({ message: "Missing fields" });

    const vehicle = await Vehicle.findById(vehicleId).populate("owner");
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return res.status(400).json({ message: "Invalid dates" });
    const days = Math.ceil((e - s) / (1000*60*60*24)) || 1;

    // Check existing CONFIRMED bookings overlap
    const overlapping = await Booking.findOne({
      vehicle: vehicleId,
      status: { $in: ["PAID", "CONFIRMED"] },
      $or: [
        { startDate: { $lte: e }, endDate: { $gte: s } }
      ]
    });
    
    if (overlapping) return res.status(409).json({ message: "Vehicle not available for selected dates" });

    const totalAmount = (vehicle.pricePerDay || 0) * days;

    const booking = await Booking.create({
      user: userId,
      owner: vehicle.owner._id,
      vehicle: vehicleId,
      startDate: s,
      endDate: e,
      days,
      totalAmount: totalAmount,
      status: "PENDING"
    });

    // Notify Owner (Console Log for now)
    console.log(`----------------------------------------------------------------`);
    console.log(`🔔 NEW BOOKING NOTIFICATION`);
    console.log(`----------------------------------------------------------------`);
    console.log(`To: ${vehicle.owner.name} (${vehicle.owner.email})`);
    console.log(`Message: A new booking for ${vehicle.title} has been created!`);
    console.log(`Dates: ${s.toDateString()} - ${e.toDateString()}`);
    console.log(`Total: $${totalAmount}`);
    console.log(`Owner Phone for Reveal: ${vehicle.owner.phone || "Not provided"}`);
    console.log(`----------------------------------------------------------------`);

    // Notify Owner via Email (Proper implementation)
    try {
      await sendEmail({
        to: vehicle.owner.email,
        subject: "🔔 New Booking Request - Flexify",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e1e1e1; border-radius: 8px;">
            <h2 style="color: #2563eb;">New Booking Request</h2>
            <p>Hi <strong>${vehicle.owner.name}</strong>,</p>
            <p>You have received a new booking request for your vehicle: <strong>${vehicle.title}</strong>.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Dates:</strong> ${s.toDateString()} - ${e.toDateString()}</p>
              <p style="margin: 5px 0 0;"><strong>Total Amount:</strong> $${totalAmount}</p>
            </div>
            <p>Please log in to your dashboard to Approve or Cancel this request.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Go to Dashboard</a>
            <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">This is an automated message from Flexify.</p>
          </div>
        `
      });
      console.log(`Email notification sent to ${vehicle.owner.email}`);
    } catch (emailErr) {
      console.error("Failed to send email notification:", emailErr.message);
      // Don't fail the request if email fails (common practice)
    }

    // Return the booking and we need the owner details (especially phone) for the front-end reveal
    const responseData = await Booking.findById(booking._id).populate("owner vehicle");
    
    return res.status(201).json(responseData);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Owner approves booking request -> status APPROVED (owner action)
export const approveBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("vehicle");
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // only owner or admin can approve
    if (booking.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    // prevent approving if overlapping confirmed booking exists
    const s = booking.startDate;
    const e = booking.endDate;
    const overlap = await Booking.findOne({
      vehicle: booking.vehicle._id,
      status: { $in: ["PAID","CONFIRMED"] },
      $or: [{ startDate: { $lte: e }, endDate: { $gte: s } }]
    });
    if (overlap) return res.status(409).json({ message: "Vehicle already booked for these dates" });

    booking.status = "APPROVED";
    await booking.save();

    // Owner should now wait for user to pay (frontend shows payment option)
    return res.json(booking);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Simulate / accept payment for a booking (user pays) -> record earning & mark CONFIRMED
// In production integrate Stripe; here we accept a call to confirm payment.
export const confirmPayment = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("vehicle owner user");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status !== "APPROVED" && booking.status !== "PENDING") {
      return res.status(400).json({ message: "Booking not in payable state" });
    }

    // compute commission
    const commissionRate = 0.05; // 5%
    const commission = parseFloat((booking.totalAmount * commissionRate).toFixed(2));
    const ownerShare = parseFloat((booking.totalAmount - commission).toFixed(2));

    // create earning record
    const earning = await Earning.create({
      owner: booking.owner,
      booking: booking._id,
      amount: booking.totalAmount,
      commission,
      ownerShare
    });

    booking.status = "CONFIRMED";
    await booking.save();

    // increment vehicle timesRented
    await Vehicle.findByIdAndUpdate(booking.vehicle._id, { $inc: { timesRented: 1 } });

    // return details (in real app we would process payment with gateway and payouts)
    return res.json({ booking, earning });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Owner or user can cancel booking (rules can be adjusted)
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // allowed if user or owner or admin
    if (req.user.role !== "admin" && booking.user.toString() !== req.user._id.toString() && booking.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    booking.status = "CANCELLED";
    await booking.save();
    return res.json({ message: "Booking cancelled" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Get bookings for current user (both owner and renter)
export const getMyBookings = async (req, res) => {
  try {
    const where = req.user.role === "owner" ? { owner: req.user._id } : { user: req.user._id };
    const bookings = await Booking.find(where).populate("vehicle user owner").sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

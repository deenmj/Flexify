import Blackout from "../models/Blackout.js";
import Vehicle from "../models/Vehicle.js";
import Booking from "../models/booking.js";
import { z } from "zod";

const createBlackoutSchema = z.object({
  vehicleId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Vehicle ID"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().optional(),
});

/**
 * 1) Create a blackout (Owner only)
 */
export const createBlackout = async (req, res) => {
  try {
    const parsed = createBlackoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0].message });
    }
    const { vehicleId, startDate, endDate, reason } = parsed.data;

    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    if (sDate >= eDate) {
      return res.status(400).json({ message: "Start date must be before end date" });
    }

    // Verify ownership
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }
    if (vehicle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You don't own this vehicle" });
    }

    // Check for overlapping CONFIRMED bookings
    const overlappingBooking = await Booking.findOne({
      vehicle: vehicleId,
      status: "CONFIRMED",
      $or: [
        { startDate: { $lte: eDate }, endDate: { $gte: sDate } }
      ]
    });

    if (overlappingBooking) {
      return res.status(409).json({ message: "Cannot blackout dates that conflict with confirmed bookings" });
    }

    // Check for overlapping Blackouts
    const overlappingBlackout = await Blackout.findOne({
      vehicle: vehicleId,
      $or: [
        { startDate: { $lte: eDate }, endDate: { $gte: sDate } }
      ]
    });

    if (overlappingBlackout) {
      return res.status(409).json({ message: "Blackout period overlaps with an existing blackout" });
    }

    // Create the blackout
    const blackout = await Blackout.create({
      vehicle: vehicleId,
      owner: req.user._id,
      startDate: sDate,
      endDate: eDate,
      reason: reason || "Owner unavailable",
    });

    res.status(201).json(blackout);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * 2) Get blackouts for a specific vehicle (Owner only)
 */
export const getVehicleBlackouts = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    // Verify ownership
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }
    if (vehicle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You don't own this vehicle" });
    }

    // Return only future/current blackouts
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const blackouts = await Blackout.find({
      vehicle: vehicleId,
      endDate: { $gte: now },
    }).sort({ startDate: 1 });

    res.json(blackouts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * 3) Delete a blackout (Owner only)
 */
export const deleteBlackout = async (req, res) => {
  try {
    const blackout = await Blackout.findById(req.params.id);
    if (!blackout) {
      return res.status(404).json({ message: "Blackout not found" });
    }

    // Verify ownership
    if (blackout.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this blackout" });
    }

    await blackout.deleteOne();
    res.json({ message: "Blackout deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

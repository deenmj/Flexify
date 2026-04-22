// backend/models/Booking.js
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "REJECTED", "COMPLETED", "CANCELLED"],
      default: "PENDING",
    },
    isReviewed: { type: Boolean, default: false },
    cancellationReason: { type: String, default: "" },
  },
  { timestamps: true }
);

// Compound index for fast availability / overlap queries
bookingSchema.index({ vehicle: 1, status: 1, startDate: 1, endDate: 1 });

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;

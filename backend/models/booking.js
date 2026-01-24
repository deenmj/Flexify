// backend/models/Booking.js
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  days: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ["PENDING","APPROVED","PAID","CONFIRMED","CANCELLED","COMPLETED"], default: "PENDING" },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;

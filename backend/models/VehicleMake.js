// backend/models/VehicleMake.js
import mongoose from "mongoose";

const vehicleMakeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    approved: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const VehicleMake = mongoose.model("VehicleMake", vehicleMakeSchema);
export default VehicleMake;

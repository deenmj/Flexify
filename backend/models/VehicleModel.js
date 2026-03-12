// backend/models/VehicleModel.js
import mongoose from "mongoose";

const vehicleModelSchema = new mongoose.Schema(
  {
    make: { type: mongoose.Schema.Types.ObjectId, ref: "VehicleMake", required: true },
    name: { type: String, required: true, trim: true },
    approved: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Prevent duplicate models for the same make
vehicleModelSchema.index({ make: 1, name: 1 }, { unique: true });

const VehicleModel = mongoose.model("VehicleModel", vehicleModelSchema);
export default VehicleModel;

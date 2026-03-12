import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    title: { type: String, required: true },
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },

    photos: [{ type: String }],

    // GeoJSON location
    location: {
      type: { type: String, enum: ["Point"], required: true, default: "Point" },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
      address: { type: String },
    },

    pricePerDay: { type: Number, required: true },
    transmission: { type: String, enum: ["Automatic", "Manual"], required: true },
    fuelType: { type: String, required: true },
    seats: { type: Number, required: true },
    description: { type: String },

    // Vehicle listing status (replaces approved/published booleans)
    status: {
      type: String,
      enum: ["pending", "active", "rejected"],
      default: "pending",
    },

    rejectionReason: { type: String, default: null },
    rejectionComment: { type: String, default: null },
    rejectedAt: { type: Date, default: null },

    isActive: { type: Boolean, default: true },
    timesRented: { type: Number, default: 0 },
    serviceType: { type: [String], default: [] },
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

vehicleSchema.index({ location: "2dsphere" });
vehicleSchema.index({ owner: 1 });

const Vehicle = mongoose.model("Vehicle", vehicleSchema);
export default Vehicle;

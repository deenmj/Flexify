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
      address: { type: String } // optional readable text
    },

    pricePerDay: { type: Number, required: true },
    transmission: { type: String, enum: ["Automatic", "Manual"], required: true },
    fuelType: { type: String, required: true },
    seats: { type: Number, required: true },
    description: { type: String },

    isActive: { type: Boolean, default: true },
    subscribedUntil: { type: Date },

    // For backwards compatibility / admin logic
    approved: { type: Boolean, default: false },
    timesRented: { type: Number, default: 0 },
    serviceType: { type: [String], default: [] }
  },
  { timestamps: true }
);

vehicleSchema.index({ location: "2dsphere" });
vehicleSchema.index({ owner: 1 });

const Vehicle = mongoose.model("Vehicle", vehicleSchema);
export default Vehicle;

import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "ownerModel" },
    ownerModel: { type: String, required: true, enum: ["User", "Staff"], default: "User" },

    title: { type: String, required: true },
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },

    photos: {
      type: [
        {
          url: { type: String, required: true },
          public_id: { type: String, required: true },
        },
      ],
      default: [],
    },

    // GeoJSON location
    location: {
      type: { type: String, enum: ["Point"], required: true, default: "Point" },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
      address: { type: String },
    },

    pricePerDay: { type: Number, required: true },
    pricePerWeek: { type: Number, default: null },
    pricePerMonth: { type: Number, default: null },
    kmLimitPerDay: { type: Number, default: null }, // Daily km limit (e.g., 200, 250, 300)
    extraKmPrice: { type: Number, default: null }, // Price per extra km beyond the daily limit (LKR)
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

    driverOption: {
      type: String,
      enum: ["self-drive", "with-driver", "both"],
      default: "self-drive"
    },
    driverPricePerDay: { type: Number, default: 0 },

    rejectionReason: { type: String, default: null },
    rejectionComment: { type: String, default: null },
    rejectedAt: { type: Date, default: null },

    isActive: { type: Boolean, default: true },
    timesRented: { type: Number, default: 0 },
    serviceType: { type: [String], default: [] },
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    
    // Additional specs
    features: { type: [String], default: [] },
    engineCapacity: { type: String, default: null },
    fuelConsumption: { type: String, default: null },
    
    // Location Details
    province: { type: String, default: null, index: true },
    district: { type: String, default: null, index: true },
    city: { type: String, default: null, index: true },

    // Contact and Special options
    mobileNumber: { type: String, required: true },
    contactMethod: {
      type: String,
      enum: ["call", "whatsapp", "both"],
      default: "both"
    },
    weddingHiresSpecial: { type: Boolean, default: false },

    // Contact click analytics (public trust signal)
    callClicks: { type: Number, default: 0 },
    whatsappClicks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

vehicleSchema.index({ location: "2dsphere" });
vehicleSchema.index({ owner: 1 });
vehicleSchema.index({ status: 1, isActive: 1, createdAt: -1 });
vehicleSchema.index({ pricePerDay: 1 });
vehicleSchema.index({ transmission: 1 });
vehicleSchema.index({ seats: 1 });
vehicleSchema.index({ serviceType: 1 });
vehicleSchema.index({ driverOption: 1 });

// Text index for general search query (q)
vehicleSchema.index(
  { title: "text", make: "text", model: "text", description: "text" },
  { weights: { title: 10, make: 5, model: 5, description: 1 }, name: "VehicleSearchTextIndex" }
);

const Vehicle = mongoose.model("Vehicle", vehicleSchema);
export default Vehicle;

import mongoose from "mongoose";

const vehicleSaleSchema = new mongoose.Schema(
  {
    // Identity & Specs
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    registrationNumber: { type: String },
    vin: { type: String },
    mileage: { type: Number, required: true },
    fuelType: { type: String, required: true },
    transmission: { type: String, required: true },
    condition: { type: String, enum: ["New", "Used", "Reconditioned"], required: true },

    // Financials
    askingPrice: { type: Number, required: true },
    commissionRate: { type: Number, default: 0 },
    isNegotiable: { type: Boolean, default: false },
    finalNegotiatedPrice: { type: Number },
    profitEarned: { type: Number },

    // Content
    title: { type: String, required: true },
    description: { type: String },
    images: { type: [String], default: [] }, // Array of URLs
    seoTags: { type: [String], default: [] },
    contactNumber: { type: String },

    // Internal Tracking
    listedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", required: true },
    assignedStaff: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
      name: { type: String },
      email: { type: String },
      phone: { type: String }
    },
    originalOwnerDetails: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String },
    },
    status: {
      type: String,
      enum: ["Available", "New", "Sold Out"],
      default: "Available",
    },
  },
  { timestamps: true }
);

// Indexes for common queries
vehicleSaleSchema.index({ status: 1, createdAt: -1 });
vehicleSaleSchema.index({ listedBy: 1 });
vehicleSaleSchema.index(
  { title: "text", make: "text", model: "text" },
  { name: "VehicleSaleSearchIndex" }
);

const VehicleSale = mongoose.model("VehicleSale", vehicleSaleSchema);
export default VehicleSale;

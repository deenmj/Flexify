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
    category: { type: [String], default: [] },

    // Financials
    askingPrice: { type: Number, required: true },
    commissionRate: { type: Number, default: 0 },
    isNegotiable: { type: Boolean, default: false },
    finalNegotiatedPrice: { type: Number },

    // Content
    title: { type: String, required: true },
    description: { type: String },
    images: { type: [String], default: [] }, // Array of URLs
    seoTags: { type: [String], default: [] },
    contactNumber: { type: String },
    contactPreference: { type: String, enum: ['whatsapp', 'call', 'both'], default: 'whatsapp' },
    
    // Location
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
      address: { type: String }
    },

    // Listing source: 'staff' = listed by Rentify staff, 'user' = listed by approved user
    listingType: { type: String, enum: ['staff', 'user'], default: 'staff' },
    // Public display name for user-listed vehicles (replaces 'Rentify Verified Sales')
    sellerDisplayName: { type: String },

    // Internal Tracking
    listedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    dateListed: { type: Date, default: Date.now },
    assignedStaff: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
      name: { type: String },
      email: { type: String },
      phone: { type: String }
    },
    originalOwnerDetails: {
      name: { type: String },
      phone: { type: String },
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
vehicleSaleSchema.index({ location: "2dsphere" });
vehicleSaleSchema.index(
  { title: "text", make: "text", model: "text" },
  { name: "VehicleSaleSearchIndex" }
);

const VehicleSale = mongoose.model("VehicleSale", vehicleSaleSchema);
export default VehicleSale;

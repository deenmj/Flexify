// backend/models/VehicleSaleListing.js
import mongoose from "mongoose";

const vehicleSaleListingSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Always 'SALE' — internal flag for query isolation
    listingType: { type: String, enum: ["SALE"], default: "SALE", required: true },

    // ── Mandatory Fields ──
    title: { type: String, required: true },
    price: { type: Number, required: true }, // Absolute price in LKR
    condition: {
      type: String,
      enum: ["Brand New", "Excellent", "Good", "Used"],
      required: true,
    },
    mileage: { type: Number, required: true }, // Total km driven
    city: { type: String, required: true }, // Sri Lankan city/district
    contactPhone: { type: String, required: true },

    // ── Optional Fields ──
    description: { type: String, default: "" },
    fuelType: { type: String, default: null },
    transmission: { type: String, enum: ["Automatic", "Manual", null], default: null },
    engineCapacity: { type: String, default: null }, // e.g. '1000cc'

    // Image gallery (3–10 images, strictly optional)
    photos: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],

    // ── Listing Lifecycle ──
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Sold"],
      default: "Pending",
    },

    rejectionReason: { type: String, default: null },
    rejectionComment: { type: String, default: null },
    rejectedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    soldAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes for efficient querying
vehicleSaleListingSchema.index({ status: 1, createdAt: -1 });
vehicleSaleListingSchema.index({ seller: 1 });
vehicleSaleListingSchema.index({ city: 1 });
vehicleSaleListingSchema.index({ price: 1 });
vehicleSaleListingSchema.index({ condition: 1 });

// Text index for search
vehicleSaleListingSchema.index(
  { title: "text", description: "text", city: "text" },
  { weights: { title: 10, city: 5, description: 1 }, name: "SaleListingSearchIndex" }
);

const VehicleSaleListing = mongoose.model("VehicleSaleListing", vehicleSaleListingSchema);
export default VehicleSaleListing;

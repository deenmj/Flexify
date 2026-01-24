import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
  {
    // The owner who listed the vehicle
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Basic vehicle info
    title: { type: String, required: true },             // Vehicle Title
    makeModel: { type: String, required: true },         // Make & Model (ex: Toyota Corolla 2022)
    year: { type: Number },                              // Manufacturing year
    pricePerDay: { type: Number, required: true },       // Daily rental price

    // Location details
    location: {
      text: { type: String },     // Readable address (e.g. Colombo)
      lat: { type: Number },      // Latitude (optional, for map filtering)
      lng: { type: Number }       // Longitude (optional)
    },

    // Additional specs
    serviceType: { type: [String], default: [] },
    transmission: { type: String }, // Manual / Auto
    seats: { type: Number },        // Seating capacity
    description: { type: String },  // Vehicle description

    // Vehicle images
    images: [{ type: String }],     // Image URLs or stored paths

    // Admin & owner control logic
    approved: { type: Boolean, default: false },        // Admin approval before publishing
    dashboardRequested: { type: Boolean, default: false }, // Owner requested dashboard
    published: { type: Boolean, default: false },       // For owner to manually publish/unpublish

    // Stats
    timesRented: { type: Number, default: 0 }           // Popularity count
  },
  { timestamps: true }
);

const Vehicle = mongoose.model("Vehicle", vehicleSchema);
export default Vehicle;

import mongoose from "mongoose";

const blackoutSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      default: "Personal use",
    },
  },
  { timestamps: true }
);

// Compound index for fast availability / overlap queries
blackoutSchema.index({ vehicle: 1, startDate: 1, endDate: 1 });

const Blackout = mongoose.model("Blackout", blackoutSchema);
export default Blackout;

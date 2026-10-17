// backend/models/ContactEvent.js
// Logs every call/whatsapp button click for time-series analytics
import mongoose from "mongoose";

const contactEventSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    type: {
      type: String,
      enum: ["call", "whatsapp"],
      required: true,
    },
  },
  { timestamps: true }
);

// Index for efficient time-range queries used in analytics
contactEventSchema.index({ createdAt: -1 });
contactEventSchema.index({ vehicle: 1, type: 1, createdAt: -1 });
contactEventSchema.index({ type: 1, createdAt: -1 });

const ContactEvent = mongoose.model("ContactEvent", contactEventSchema);
export default ContactEvent;

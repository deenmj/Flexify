import mongoose from "mongoose";

const contactClickSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["call", "whatsapp"],
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      index: true,
    },
    hour: {
      type: Number, // 0 - 23
      index: true,
    },
  },
  { timestamps: true }
);

contactClickSchema.index({ createdAt: -1 });
contactClickSchema.index({ vehicle: 1, type: 1, createdAt: -1 });
contactClickSchema.index({ date: 1, type: 1 });
contactClickSchema.index({ vehicle: 1, date: 1 });

const ContactClick = mongoose.model("ContactClick", contactClickSchema);
export default ContactClick;

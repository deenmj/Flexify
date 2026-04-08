import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    type: { type: String, enum: ["bug", "suggestion", "general"], default: "general" },
    message: { type: String, required: true },
    contactEmail: { type: String },
    deviceInfo: { type: Object },
    status: { type: String, enum: ["pending", "reviewed", "resolved"], default: "pending" },
  },
  { timestamps: true }
);

const Feedback = mongoose.model("Feedback", feedbackSchema);
export default Feedback;

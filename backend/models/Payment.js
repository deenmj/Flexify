import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tier: {
      type: String,
      enum: ["STANDARD", "PRO"],
      required: true,
    },
    duration: {
      type: String,
      enum: ["MONTHLY", "BI_ANNUAL"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "failed"],
      default: "pending",
    },
    method: {
      type: String,
      enum: ["MANUAL"],
      default: "MANUAL",
    },
    transactionId: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    reference: {
      type: String,
      required: true,
    },
    rejectionReason: {
        type: String,
        default: null
    },
    receiptImage: {
        type: String,
        default: null
    }
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;

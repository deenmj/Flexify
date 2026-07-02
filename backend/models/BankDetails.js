import mongoose from "mongoose";

const bankDetailsSchema = new mongoose.Schema(
  {
    bankName: {
      type: String,
      required: true,
      default: "Commercial Bank",
    },
    accountName: {
      type: String,
      required: true,
      default: "Rentify Pvt Ltd",
    },
    accountNumber: {
      type: String,
      required: true,
      default: "8010045622",
    },
    referenceEmail: {
      type: String,
      required: true,
      default: "admin@rentify.lk",
    },
    notes: {
      type: String,
      default: "",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const BankDetails = mongoose.model("BankDetails", bankDetailsSchema);

export default BankDetails;

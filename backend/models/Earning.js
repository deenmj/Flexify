import mongoose from "mongoose";

const earningSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    adminCommission: {
      type: Number,
      required: true,
      default: 0,
    },
    ownerEarning: {
      type: Number,
      required: true,
      default: 0,
    },
    isPaidToOwner: {
      type: Boolean,
      default: false,
    },
    isCommissionPaid: {
      type: Boolean,
      default: false,
    },
    paymentDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Earning = mongoose.model("Earning", earningSchema);
export default Earning;

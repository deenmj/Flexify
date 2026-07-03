// backend/models/Staff.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    phone: { type: String, default: "" },
    address: { type: String, default: "" },

    password: { type: String, required: false },

    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    // Internal roles
    role: {
      type: String,
      enum: ["superadmin", "admin", "staff", "manager", "supervisor"],
      default: "staff",
    },

    // Account status
    status: {
      type: String,
      enum: ["active", "blocked", "deleted"],
      default: "active",
    },

    // Email verified
    verified: { type: Boolean, default: false },

    // Password reset / Email auth
    emailVerificationToken: { type: String },
    emailVerifiedAt: { type: Date },
    otpCode: { type: String },
    otpExpires: { type: Date },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },

    profilePic: { type: String, default: "" },
    notificationEmail: { type: String, default: "" },
    isNotificationEmailActive: { type: Boolean, default: false },

    // Wishlists
    rentWishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" }],
    saleWishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "VehicleSale" }],
  },
  { timestamps: true }
);

// Hash password before save
staffSchema.pre("save", async function (next) {
  if (!this.password || !this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
staffSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

const Staff = mongoose.model("Staff", staffSchema);
export default Staff;

// backend/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const documentsSchema = new mongoose.Schema({
  nicFront: { type: String, default: "" },
  nicBack: { type: String, default: "" },
  license: { type: String, default: "" },
  selfie: { type: String, default: "" },
  address: { type: String, default: "" },
}, { _id: false });

const userSchema = new mongoose.Schema(
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

    // Core role: user | owner | subadmin | superadmin
    role: {
      type: String,
      enum: ["user", "owner", "subadmin", "superadmin"],
      default: "user",
    },

    // Owner sub-type (only relevant when role === "owner")
    ownerType: {
      type: String,
      enum: ["VERIFIED", "UNVERIFIED"],
      default: null,
    },

    // Account status
    status: {
      type: String,
      enum: ["active", "blocked", "deleted"],
      default: "active",
    },

    // Email verified (set true after email link click)
    verified: { type: Boolean, default: false },

    // KYC verification for renters / owners
    isKycVerified: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ["not_submitted", "pending", "approved", "rejected"],
      default: "not_submitted",
    },

    // KYC documents (file paths)
    documents: { type: documentsSchema, default: () => ({}) },

    // Email verification
    emailVerificationToken: { type: String },
    emailVerifiedAt: { type: Date },

    // Password reset
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },

    profilePic: { type: String, default: "" },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.password || !this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;

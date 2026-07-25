// backend/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const documentsSchema = new mongoose.Schema({
  idNumber: { type: String, default: "" },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  license: { type: String, default: "" },
  selfie: { type: String, default: "" },
  kycConsentGiven: { type: Boolean, default: false },
}, { _id: false });

const subscriptionSchema = new mongoose.Schema({
  tier: { type: String, enum: ['FREE', 'STANDARD', 'PRO'], default: 'FREE' },
  status: { type: String, enum: ['free', 'active', 'expired'], default: 'free' },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: null },
  gracePeriodEnd: { type: Date, default: null },
  notifiedGraceEnd: { type: Boolean, default: false },
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

    // Core role: user | owner | staff | admin
    role: {
      type: String,
      enum: ["user", "owner", "staff", "admin", "subadmin", "superadmin"],
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
    // Deprecated: Splitting into rent/sales specific statuses
    verificationStatus: {
      type: String,
      enum: ["not_submitted", "pending", "approved", "rejected"],
      default: "not_submitted",
    },
    rentVerificationStatus: {
      type: String,
      enum: ["not_submitted", "pending", "approved", "rejected"],
      default: "not_submitted",
    },
    salesVerificationStatus: {
      type: String,
      enum: ["not_submitted", "pending", "approved", "rejected"],
      default: "not_submitted",
    },
    hasSalesAccess: { type: Boolean, default: false },
    salesRequestStatus: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },

    rejectionReason: { type: String, default: null },
    rejectionComment: { type: String, default: null },
    rejectedAt: { type: Date, default: null },
    kycVerifiedAt: { type: Date, default: null },

    // KYC documents (file paths)
    documents: { type: documentsSchema, default: () => ({}) },

    // Subscription status (for owners)
    subscription: { 
      type: subscriptionSchema, 
      default: null
    },

    // Email verification
    emailVerificationToken: { type: String },
    emailVerifiedAt: { type: Date },
    otpCode: { type: String },
    otpExpires: { type: Date },

    // Password reset
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

userSchema.virtual('vehicles', {
  ref: 'Vehicle',
  localField: '_id',
  foreignField: 'owner'
});

userSchema.set('toObject', { virtuals: true });
userSchema.set('toJSON', { virtuals: true });

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

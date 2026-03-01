// backend/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const verificationRequestSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  phone: String,
  address: String,
  years: Number,
  description: String,
  idFile: String,
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  type: { type: String, default: "normal" },
  submittedAt: { type: Date, default: Date.now },
  approvedAt: Date,
  rejectedAt: Date,
});

const verifiedBusinessSchema = new mongoose.Schema({
  businessName: String,
  contactEmail: String,
  phone: String,
  address: String,
  registrationNo: String,
  documents: [String],
  verifiedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },

    phone: {
      type: String,
      default: ""
    },

    password: {
      type: String,
      required: false
    },

    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local"
    },

    role: {
      type: String,
      enum: ["user", "owner", "verifiedOwner", "admin"],
      default: "user"
    },

    status: {
      type: String,
      enum: ["active", "blocked", "deleted"],
      default: "active"
    },

    verified: { type: Boolean, default: false },

    // ✅ EMAIL VERIFICATION FIELDS
    emailVerificationToken: { type: String },
    emailVerifiedAt: { type: Date },

    // 🔐 PASSWORD RESET FIELDS
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },


    profilePic: { type: String, default: "" },
    dashboardCreated: { type: Boolean, default: false },

    verificationRequest: verificationRequestSchema,
    verifiedBusiness: verifiedBusinessSchema,
  },
  { timestamps: true }
);


// 🔒 Hash password ONLY if it exists & is modified
userSchema.pre("save", async function (next) {
  if (!this.password || !this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🔍 Compare password (local users only)
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;

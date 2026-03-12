import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ["role_change", "user_delete", "user_promote", "kyc_bulk_approve"],
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ipAddress: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for fast chronological retrieval
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;

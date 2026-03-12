import AuditLog from "../models/AuditLog.js";

/**
 * Log a critical administrative action.
 * Silent fail to ensure main action is not blocked.
 */
export const logAdminAction = async (req, action, targetUserId, details = {}) => {
  try {
    // Basic safety check: ensure the performer is at least a subadmin/superadmin
    // (Actual access control is handled by middleware, but this is a secondary guard)
    if (!req.user || (req.user.role !== "superadmin" && req.user.role !== "subadmin")) {
      return;
    }

    const log = new AuditLog({
      action,
      performedBy: req.user._id,
      targetUser: targetUserId,
      details,
      ipAddress: req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress,
      userAgent: req.headers["user-agent"],
    });

    await log.save();
  } catch (err) {
    console.error("Audit log failed to save:", err);
  }
};

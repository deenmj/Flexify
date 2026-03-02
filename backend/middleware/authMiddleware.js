// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Protect — verify JWT token, attach user to req
 */
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) return res.status(401).json({ message: "User not found" });

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

/**
 * requireRole — generic role gate. Pass one or more allowed roles.
 * Usage: requireRole("owner", "subadmin", "superadmin")
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authorized" });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: `Access denied. Required role: ${roles.join(" or ")}` });
  }
  next();
};

/**
 * requireSuperAdmin — only superadmin
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authorized" });
  if (req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Superadmin access required" });
  }
  next();
};

/**
 * requireSubAdmin — subadmin OR superadmin
 */
export const requireSubAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authorized" });
  if (req.user.role !== "subadmin" && req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Sub-admin access required" });
  }
  next();
};

/**
 * requireVerifiedOwner — owner with ownerType VERIFIED, OR subadmin/superadmin
 */
export const requireVerifiedOwner = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authorized" });
  const isVerifiedOwner = req.user.role === "owner" && req.user.ownerType === "VERIFIED";
  const isAdmin = req.user.role === "subadmin" || req.user.role === "superadmin";
  if (!isVerifiedOwner && !isAdmin) {
    return res.status(403).json({ message: "Verified owner access required" });
  }
  next();
};

/**
 * requireKycVerified — user must have KYC approved
 */
export const requireKycVerified = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authorized" });
  if (!req.user.isKycVerified) {
    return res.status(403).json({
      message: "KYC verification required. Please submit your documents first.",
      verificationNeeded: true,
      verificationStatus: req.user.verificationStatus,
    });
  }
  next();
};

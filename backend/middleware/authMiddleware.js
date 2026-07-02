import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Staff from "../models/Staff.js";

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
    
    if (decoded.isStaff) {
      req.user = await Staff.findById(decoded.id).select("-password");
      // Fallback: if Staff record was deleted but they exist in User
      if (!req.user) req.user = await User.findById(decoded.id).select("-password");
    } else {
      req.user = await User.findById(decoded.id).select("-password");
      // Fallback: if this user was migrated to Staff but has a stale JWT without isStaff
      if (!req.user) req.user = await Staff.findById(decoded.id).select("-password");
    }

    if (!req.user) return res.status(401).json({ message: "User not found" });

    if (req.user.status === "blocked") {
      return res.status(403).json({ message: "Your account has been suspended" });
    }

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

/**
 * Protect Optional — verify JWT token if provided, attach user to req but do not block if missing
 */
export const protectOptional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      let user;
      if (decoded.isStaff) {
        user = await Staff.findById(decoded.id).select("-password");
        if (!user) user = await User.findById(decoded.id).select("-password");
      } else {
        user = await User.findById(decoded.id).select("-password");
        if (!user) user = await Staff.findById(decoded.id).select("-password");
      }

      if (user && user.status !== "blocked") {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    next();
  }
};

/**
 * requireRole — generic role gate. Pass one or more allowed roles.
 * Usage: requireRole("owner", "staff", "admin")
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authorized" });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: `Access denied. Required role: ${roles.join(" or ")}` });
  }
  next();
};

/**
 * requireAdmin — admin or superadmin
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authorized" });
  if (req.user.role !== "admin" && req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

/**
 * requireStaff — staff OR admin OR superadmin
 */
export const requireStaff = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authorized" });
  if (req.user.role !== "staff" && req.user.role !== "admin" && req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Staff access required" });
  }
  next();
};

/**
 * isMasterCEO — specific to Admin@rentify.lk and superadmin
 */
export const isMasterCEO = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authorized" });
  if (req.user.role !== "superadmin" || !req.user.email || req.user.email.toLowerCase() !== "admin@rentify.lk") {
    return res.status(403).json({ message: "CEO Master Access Required" });
  }
  next();
};

/**
 * requireVerifiedOwner — owner with ownerType VERIFIED, OR staff/admin/superadmin
 */
export const requireVerifiedOwner = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authorized" });
  const isVerifiedOwner = req.user.role === "owner" && req.user.ownerType === "VERIFIED";
  const isAdmin = req.user.role === "staff" || req.user.role === "admin" || req.user.role === "superadmin";
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

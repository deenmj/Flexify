// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js"; // adjust path if filename is lowercase

// ✅ Middleware to verify token
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Optional: attach user info (remove password)
    req.user = await User.findById(decoded.id).select("-password");

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};



/**
 * adminOnly - middleware to allow only admin
 */
export const adminOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authorized" });
  if (req.user.role !== "admin" && req.user.role !== "staff") {
    return res.status(403).json({ message: "Admin or Staff only" });
  }
  next();
};

/**
 * ownerOrAdmin - allow owner or admin
 */
export const ownerOrAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authorized" });
  if (req.user.role !== "owner" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Owner or admin only" });
  }
  next();
};


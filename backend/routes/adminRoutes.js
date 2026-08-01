// backend/routes/adminRoutes.js — SUPERADMIN routes
import express from "express";
import {
  getAdminStats,
  getAllUsers,
  updateUserInfo,
  updateUserRole,
  updateUserStatus,
  getUserKyc,
  deleteUserKyc,
  getAllVehicles,
  getAllBookings,
  getAuditLogs,
  updateUserSubscription,
  getPendingPayments,
  verifyPayment,
  deleteVehicle,
  cancelBooking,
  getUserVehicles,
  createVehicleForUser,
} from "../controllers/adminController.js";
import { protect, requireAdmin, requireStaff } from "../middleware/authMiddleware.js";
import { upload } from "../utils/upload.js";

const router = express.Router();

// Superadmin Routes
router.get("/stats", protect, requireAdmin, getAdminStats);
router.get("/users", protect, requireAdmin, getAllUsers);
router.put("/users/:id", protect, requireAdmin, updateUserInfo);
router.patch("/users/:id/role", protect, requireAdmin, updateUserRole);
router.patch("/users/:id/status", protect, requireAdmin, updateUserStatus);
router.get("/users/:id/kyc", protect, requireAdmin, getUserKyc);
router.delete("/users/:id/kyc", protect, requireAdmin, deleteUserKyc);
router.patch("/users/:id/subscription", protect, requireAdmin, updateUserSubscription);

// User vehicle management (admin)
router.get("/users/:id/vehicles", protect, requireAdmin, getUserVehicles);
router.post("/users/:id/vehicles", protect, requireAdmin, upload.array("photos", 10), createVehicleForUser);

router.get("/vehicles", protect, requireAdmin, getAllVehicles);
router.delete("/vehicles/:id", protect, requireAdmin, deleteVehicle);
router.get("/bookings", protect, requireAdmin, getAllBookings);
router.patch("/bookings/:id/cancel", protect, requireAdmin, cancelBooking);
router.get("/audit-logs", protect, requireAdmin, getAuditLogs);
router.get("/payments/pending", protect, requireStaff, getPendingPayments);
router.post("/payments/verify", protect, requireStaff, verifyPayment);

export default router;



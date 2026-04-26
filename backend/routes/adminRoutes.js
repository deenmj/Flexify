// backend/routes/adminRoutes.js — SUPERADMIN routes
import express from "express";
import {
  getAdminStats,
  getAllUsers,
  updateUserInfo,
  updateUserRole,
  updateUserStatus,
  deleteUser,
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
} from "../controllers/adminController.js";
import { protect, requireSuperAdmin, requireSubAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/stats", protect, requireSuperAdmin, getAdminStats);
router.get("/users", protect, requireSuperAdmin, getAllUsers);
router.put("/users/:id", protect, requireSuperAdmin, updateUserInfo);
router.patch("/users/:id/role", protect, requireSuperAdmin, updateUserRole);
router.patch("/users/:id/status", protect, requireSuperAdmin, updateUserStatus);
router.get("/users/:id/kyc", protect, requireSuperAdmin, getUserKyc);
router.delete("/users/:id/kyc", protect, requireSuperAdmin, deleteUserKyc);
router.patch("/users/:id/subscription", protect, requireSuperAdmin, updateUserSubscription);
router.delete("/users/:id", protect, requireSuperAdmin, deleteUser);
router.get("/vehicles", protect, requireSuperAdmin, getAllVehicles);
router.delete("/vehicles/:id", protect, requireSuperAdmin, deleteVehicle);
router.get("/bookings", protect, requireSuperAdmin, getAllBookings);
router.patch("/bookings/:id/cancel", protect, requireSuperAdmin, cancelBooking);
router.get("/audit-logs", protect, requireSuperAdmin, getAuditLogs);
router.get("/payments/pending", protect, requireSubAdmin, getPendingPayments);
router.post("/payments/verify", protect, requireSubAdmin, verifyPayment);

export default router;

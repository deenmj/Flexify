// backend/routes/adminRoutes.js — SUPERADMIN routes
import express from "express";
import {
  getAdminStats,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAllVehicles,
  getAllBookings,
  getAuditLogs,
} from "../controllers/adminController.js";
import { protect, requireSuperAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/stats", protect, requireSuperAdmin, getAdminStats);
router.get("/users", protect, requireSuperAdmin, getAllUsers);
router.patch("/users/:id/role", protect, requireSuperAdmin, updateUserRole);
router.delete("/users/:id", protect, requireSuperAdmin, deleteUser);
router.get("/vehicles", protect, requireSuperAdmin, getAllVehicles);
router.get("/bookings", protect, requireSuperAdmin, getAllBookings);
router.get("/audit-logs", protect, requireSuperAdmin, getAuditLogs);

export default router;

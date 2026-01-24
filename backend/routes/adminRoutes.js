// backend/routes/adminRoutes.js
import express from "express";
import {
  getAdminStats,
  listPendingVehicles,
  listPendingVerifications,
  getVerificationRequest,
  rejectOwnerVerification,
  approveOwnerVerification,
  getAdminRequests,
} from "../controllers/adminController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// ========== ADMIN ROUTES ==========
router.get("/stats", protect, adminOnly, getAdminStats);
router.get("/pending-vehicles", protect, adminOnly, listPendingVehicles);
router.get("/pending-verifications", protect, adminOnly, listPendingVerifications);
router.get("/verification/:userId", protect, adminOnly, getVerificationRequest);
router.put("/reject-owner/:userId", protect, adminOnly, rejectOwnerVerification);
router.put("/verify-owner/:userId", protect, adminOnly, approveOwnerVerification);
router.get("/requests", protect, adminOnly, getAdminRequests);

export default router;

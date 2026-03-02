// backend/routes/subadminRoutes.js — SubAdmin routes
import express from "express";
import {
    getPendingUsers,
    getUserKycDetails,
    approveUserKyc,
    rejectUserKyc,
    getPendingVehicles,
    approveVehicle,
    rejectVehicle,
    getSubadminStats,
} from "../controllers/subadminController.js";
import { protect, requireSubAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/stats", protect, requireSubAdmin, getSubadminStats);
router.get("/pending-users", protect, requireSubAdmin, getPendingUsers);
router.get("/user/:id", protect, requireSubAdmin, getUserKycDetails);
router.patch("/approve-user/:id", protect, requireSubAdmin, approveUserKyc);
router.patch("/reject-user/:id", protect, requireSubAdmin, rejectUserKyc);
router.get("/pending-vehicles", protect, requireSubAdmin, getPendingVehicles);
router.patch("/approve-vehicle/:id", protect, requireSubAdmin, approveVehicle);
router.patch("/reject-vehicle/:id", protect, requireSubAdmin, rejectVehicle);

export default router;

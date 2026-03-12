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
router.patch("/reviews/:id/status", protect, requireSubAdmin, updateReviewStatus);
router.get("/reviews", protect, requireSubAdmin, getAllReviews);

export default router;

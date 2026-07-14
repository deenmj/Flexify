// backend/routes/subadminRoutes.js
import express from "express";
import { protect, requireStaff } from "../middleware/authMiddleware.js";
import {
    getPendingUsers,
    getUserKycDetails,
    approveUserKyc,
    rejectUserKyc,
    getPendingVehicles,
    approveVehicle,
    rejectVehicle,
    getSubadminStats,
    getPendingMakes,
    getPendingModels,
    approveMake,
    approveModel,
    deleteMake,
    deleteModel
} from "../controllers/subadminController.js";
import { getAllReviews, updateReviewStatus } from "../controllers/reviewController.js";

const router = express.Router();

// Middleware to protect all subadmin routes
router.use(protect);
router.use(requireStaff);

router.get("/stats", getSubadminStats);
router.get("/pending-users", getPendingUsers);
router.get("/user/:id", getUserKycDetails);
router.patch("/approve-user/:id", approveUserKyc);
router.patch("/reject-user/:id", rejectUserKyc);

router.get("/pending-vehicles", getPendingVehicles);
router.patch("/approve-vehicle/:id", approveVehicle);
router.patch("/reject-vehicle/:id", rejectVehicle);

// Makes & Models
router.get("/pending-makes", getPendingMakes);
router.get("/pending-models", getPendingModels);
router.patch("/approve-make/:id", approveMake);
router.patch("/approve-model/:id", approveModel);
router.delete("/make/:id", deleteMake);
router.delete("/model/:id", deleteModel);

// Reviews
router.get("/reviews", getAllReviews);
router.patch("/reviews/:id/status", updateReviewStatus);

export default router;



import express from "express";
import { createReview, getVehicleReviews } from "../controllers/reviewController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createReview);
router.get("/vehicle/:id", getVehicleReviews);

export default router;

import express from "express";
import { createReview, getVehicleReviews, getOwnerReviews, hideReviewByOwner } from "../controllers/reviewController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createReview);
router.get("/vehicle/:id", getVehicleReviews);
router.get("/owner", protect, getOwnerReviews);
router.patch("/:id/hide", protect, hideReviewByOwner);

export default router;



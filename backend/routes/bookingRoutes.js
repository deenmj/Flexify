// backend/routes/bookingRoutes.js
import express from "express";
import {
  createBooking, approveBooking, confirmPayment,
  cancelBooking, getMyBookings
} from "../controllers/bookingController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createBooking);

// owner or admin approves booking request
router.put("/approve/:id", protect, approveBooking);

// simulate payment confirmation (user pays)
router.put("/pay/:id", protect, confirmPayment);

// cancel booking
router.put("/cancel/:id", protect, cancelBooking);

// get my bookings
router.get("/my", protect, getMyBookings);

export default router;

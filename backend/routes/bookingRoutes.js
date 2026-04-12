// backend/routes/bookingRoutes.js
import express from "express";
import {
  createBooking,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  getMyBookings,
} from "../controllers/bookingController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createBooking);
router.put("/accept/:id", protect, acceptBooking);
router.put("/reject/:id", protect, rejectBooking);
router.put("/cancel/:id", protect, cancelBooking);
router.get("/my", protect, getMyBookings);
router.get("/renter-details/:bookingId", protect, getRenterDetails);

export default router;

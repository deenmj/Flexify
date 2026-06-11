// backend/routes/saleListingRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireSubAdmin } from "../middleware/authMiddleware.js";
import { upload } from "../utils/upload.js";
import {
  createSaleListing,
  getApprovedSaleListings,
  getSaleListingById,
  getMySaleListings,
  markAsSold,
  deleteSaleListing,
  getPendingSaleListings,
  approveSaleListing,
  rejectSaleListing,
  getAllSaleListings,
} from "../controllers/saleListingController.js";

const router = express.Router();

// Public routes
router.get("/", getApprovedSaleListings);
router.get("/all", protect, requireSubAdmin, getAllSaleListings);
router.get("/my", protect, getMySaleListings);
router.get("/pending", protect, requireSubAdmin, getPendingSaleListings);
router.get("/:id", getSaleListingById);

// Authenticated CRUD
router.post("/", protect, upload.array("photos", 10), createSaleListing);
router.patch("/:id/sold", protect, markAsSold);
router.delete("/:id", protect, deleteSaleListing);

// SubAdmin+ approval actions
router.patch("/:id/approve", protect, requireSubAdmin, approveSaleListing);
router.patch("/:id/reject", protect, requireSubAdmin, rejectSaleListing);

export default router;

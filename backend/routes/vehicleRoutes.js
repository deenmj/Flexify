// backend/routes/vehicleRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../utils/upload.js";
import {
  listVehicles,
  getVehicleById,
  getMyVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  toggleVehicleStatus,
  getVehicleAvailability,
  getMakes,
  getModels,
  getPublicStats,
} from "../controllers/vehicleController.js";

const router = express.Router();

// Public
router.get("/stats/public", getPublicStats);
router.get("/", listVehicles);
router.get("/makes", getMakes);
router.get("/models/:makeId", getModels);
router.get("/my", protect, getMyVehicles);
router.get("/:id/availability", getVehicleAvailability);
router.get("/:id", getVehicleById);

// Owner CRUD
router.post("/", protect, upload.array("photos", 10), createVehicle);
router.put("/:id", protect, upload.array("photos", 10), updateVehicle);
router.delete("/:id", protect, deleteVehicle);
router.patch("/:id/status", protect, toggleVehicleStatus);

export default router;

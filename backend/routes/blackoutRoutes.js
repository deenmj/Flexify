import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createBlackout,
  getVehicleBlackouts,
  deleteBlackout,
} from "../controllers/blackoutController.js";

const router = express.Router();

// All blackout routes require auth
router.use(protect);

router.post("/", createBlackout);
router.get("/vehicle/:vehicleId", getVehicleBlackouts);
router.delete("/:id", deleteBlackout);

export default router;



import express from "express";
import { getBankDetails, updateBankDetails } from "../controllers/bankDetailsController.js";
import { protect, requireSuperAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/")
  .get(protect, getBankDetails)
  .patch(protect, requireSuperAdmin, updateBankDetails);

export default router;

import express from "express";
import { getBankDetails, updateBankDetails } from "../controllers/bankDetailsController.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/")
  .get(protect, getBankDetails)
  .patch(protect, requireAdmin, updateBankDetails);

export default router;



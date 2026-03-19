import express from "express";
import { getBankDetails, updateBankDetails } from "../controllers/bankDetailsController.js";
import { protect, superAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/")
  .get(protect, getBankDetails)
  .patch(protect, superAdmin, updateBankDetails);

export default router;

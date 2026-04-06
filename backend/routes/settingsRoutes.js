import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getContactDetails, updateContactDetails } from '../controllers/settingsController.js';

const router = express.Router();

router.route('/contact')
  .get(getContactDetails)
  .put(protect, updateContactDetails);

export default router;

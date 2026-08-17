import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import { getContactDetails, updateContactDetails, getFounders, updateFounders, deleteFounder, getMaintenanceMode, toggleMaintenanceMode } from '../controllers/settingsController.js';

const router = express.Router();

// Contact details
router.route('/contact')
  .get(getContactDetails)
  .put(protect, updateContactDetails);

// Founders — use memory storage so Cloudinary upload happens in the controller
// This prevents route-module-load failures if Cloudinary env vars are missing
const founderUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
});

router.get('/founders', getFounders);
router.put('/founders', protect, founderUpload.any(), updateFounders);
router.delete('/founders/:index', protect, deleteFounder);

// Maintenance Mode
router.route('/maintenance')
  .get(getMaintenanceMode)
  .put(protect, toggleMaintenanceMode);

export default router;




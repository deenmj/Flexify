import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import { founderStorage } from '../utils/cloudinary.js';
import { getContactDetails, updateContactDetails, getFounders, updateFounders, deleteFounder } from '../controllers/settingsController.js';

const router = express.Router();

// Contact details
router.route('/contact')
  .get(getContactDetails)
  .put(protect, updateContactDetails);

// Founders — Cloudinary storage (persistent, no ephemeral disk dependency)
const founderUpload = multer({
  storage: founderStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
});

router.get('/founders', getFounders);
router.put('/founders', protect, founderUpload.any(), updateFounders);
router.delete('/founders/:index', protect, deleteFounder);

export default router;

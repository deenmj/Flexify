import express from 'express';
import multer from 'multer';
import path from 'path';
import { protect } from '../middleware/authMiddleware.js';
import { getContactDetails, updateContactDetails, getFounders, updateFounders, deleteFounder } from '../controllers/settingsController.js';

const router = express.Router();

// Contact details
router.route('/contact')
  .get(getContactDetails)
  .put(protect, updateContactDetails);

// Founders — multer for image uploads to uploads/avatars
const founderStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/avatars'),
  filename: (req, file, cb) => {
    const uniqueSuffix = `founder-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});
const founderUpload = multer({
  storage: founderStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
  },
});

router.get('/founders', getFounders);
router.put('/founders', protect, founderUpload.any(), updateFounders);
router.delete('/founders/:index', protect, deleteFounder);

export default router;

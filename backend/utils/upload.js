import multer from "multer";
import { vehicleStorage } from "./cloudinary.js";

// Cloudinary storage for vehicles
export const upload = multer({
  storage: vehicleStorage,
  limits: {
    fileSize: 1024 * 1024 * 10, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed!"), false);
    }
  },
});

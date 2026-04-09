import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const kycStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'flexify/kyc',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

export const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'flexify/profiles',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

export default cloudinary;

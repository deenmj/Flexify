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
    transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
  },
});

export const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'flexify/profiles',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto', fetch_format: 'auto' }],
  },
});

export const vehicleStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'flexify/vehicles',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 1280, height: 1280, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
  },
});

export const receiptStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'flexify/receipts',
    allowed_formats: ['jpg', 'png', 'jpeg', 'pdf'],
  },
});

export default cloudinary;

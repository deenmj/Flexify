// backend/scripts/compressExistingImages.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import cloudinary from "../utils/cloudinary.js"; // Import configured Cloudinary SDK

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/flexify";

// SAFETY CHECK: Prevent accidental runs
if (process.argv[2] !== '--confirm') {
  console.log("\n==========================================================================");
  console.log("⚠️  SAFETY LOCK ACTIVE");
  console.log("This script will physically overwrite images on Cloudinary to permanently");
  console.log("reduce storage space. This action cannot be undone.");
  console.log("To execute this script, you must explicitly pass the --confirm flag:");
  console.log("\n    node scripts/compressExistingImages.js --confirm");
  console.log("==========================================================================\n");
  process.exit(0);
}

console.log("=================================================");
console.log("  Flexify Storage Space Optimization Script      ");
console.log("=================================================");

// Helper to generate the optimized delivery URL (which we'll ask Cloudinary to fetch and save)
function generateOptimizedUrl(url, targetWidth = 1280) {
  if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) return url;
  if (url.includes('q_auto,f_auto')) return url;
  
  const uploadRegex = /\/upload\/(?:[^\/]+\/)?(v\d+)/;
  const replacement = `/upload/q_auto,f_auto,w_${targetWidth},c_limit/$1`;
  
  if (uploadRegex.test(url)) return url.replace(uploadRegex, replacement);
  return url.replace('/upload/', `/upload/q_auto,f_auto,w_${targetWidth},c_limit/`);
}

// Helper to extract Cloudinary public_id from a raw URL (needed for KYC docs)
function extractPublicId(url) {
  // Matches everything after /upload/ (and optional /v12345/) up to the final file extension
  const match = url.match(/\/upload\/(?:(?:q_[^/]+|f_[^/]+|w_[^/]+|c_[^/]+)[/,])*?(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/);
  return match ? match[1] : null;
}

// Helper to format bytes to KB
function formatKB(bytes) {
  return (bytes / 1024).toFixed(1) + " KB";
}

async function physicallyCompressCloudinaryImage(url, publicId, targetWidth) {
  try {
    // 1. Get original size
    const originalResource = await cloudinary.api.resource(publicId);
    const originalBytes = originalResource.bytes;

    // 2. Generate the dynamic, compressed URL
    const optimizedUrl = generateOptimizedUrl(url, targetWidth);
    if (url === optimizedUrl) return { updatedUrl: url, skipped: true }; // Already compressed

    // 3. Ask Cloudinary to physically overwrite the old file with the newly compressed version
    const uploadResult = await cloudinary.uploader.upload(optimizedUrl, {
      public_id: publicId,
      overwrite: true,
      invalidate: true
    });

    const newBytes = uploadResult.bytes;
    const savingsPercent = Math.round(((originalBytes - newBytes) / originalBytes) * 100);

    return {
      updatedUrl: uploadResult.secure_url,
      originalBytes,
      newBytes,
      savingsPercent,
      skipped: false
    };
  } catch (error) {
    console.error(`Failed to compress image ${publicId}:`, error.message);
    return { updatedUrl: url, skipped: true, error: true };
  }
}

async function run() {
  try {
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(MONGO_URI);
    console.log("✅ Database Connected.\n");

    let totalStorageSaved = 0;
    let kycOptimizedCount = 0;
    let vehiclePhotosOptimizedCount = 0;

    // --- 1. Optimize Vehicle Photos ---
    console.log("--- 🚗 Optimizing Vehicle Photos ---");
    const vehicles = await Vehicle.find({ "photos.url": { $regex: "res.cloudinary.com" } });
    
    for (const vehicle of vehicles) {
      let vehicleModified = false;
      const updatedPhotos = [];

      for (const photo of vehicle.photos) {
        if (!photo.url.includes('q_auto')) { // Basic check to skip already optimized
          process.stdout.write(`Compressing Vehicle Photo (${photo.public_id})... `);
          const result = await physicallyCompressCloudinaryImage(photo.url, photo.public_id, 1280);
          
          if (!result.skipped) {
            console.log(`✅ [${formatKB(result.originalBytes)} ➡️  ${formatKB(result.newBytes)}] Saved ${result.savingsPercent}%`);
            totalStorageSaved += (result.originalBytes - result.newBytes);
            vehiclePhotosOptimizedCount++;
            vehicleModified = true;
            updatedPhotos.push({ ...photo.toObject(), url: result.updatedUrl });
          } else {
            console.log(`⏭️  Skipped`);
            updatedPhotos.push(photo);
          }
        } else {
          updatedPhotos.push(photo);
        }
      }

      if (vehicleModified) {
        vehicle.photos = updatedPhotos;
        await vehicle.save();
      }
    }

    // --- 2. Optimize User KYC Documents ---
    console.log("\n--- 👤 Optimizing User KYC Documents ---");
    const users = await User.find({
      $or: [
        { "documents.nicFront": { $regex: "res.cloudinary.com" } },
        { "documents.nicBack": { $regex: "res.cloudinary.com" } },
        { "documents.license": { $regex: "res.cloudinary.com" } },
        { "documents.selfie": { $regex: "res.cloudinary.com" } }
      ]
    });

    for (const user of users) {
      let userModified = false;
      const docs = ['nicFront', 'nicBack', 'license', 'selfie'];
      
      for (const field of docs) {
        if (user.documents && user.documents[field] && !user.documents[field].includes('q_auto')) {
          const originalUrl = user.documents[field];
          const publicId = extractPublicId(originalUrl);
          
          if (publicId) {
            process.stdout.write(`Compressing KYC ${field} (${publicId})... `);
            const result = await physicallyCompressCloudinaryImage(originalUrl, publicId, 1600);
            
            if (!result.skipped) {
              console.log(`✅ [${formatKB(result.originalBytes)} ➡️  ${formatKB(result.newBytes)}] Saved ${result.savingsPercent}%`);
              totalStorageSaved += (result.originalBytes - result.newBytes);
              user.documents[field] = result.updatedUrl;
              userModified = true;
              kycOptimizedCount++;
            } else {
              console.log(`⏭️  Skipped`);
            }
          }
        }
      }

      if (userModified) {
        user.markModified('documents');
        await user.save();
      }
    }

    console.log("\n=================================================");
    console.log("🎉 SUCCESS: Physical Cloudinary Storage Optimized");
    console.log(`   - Vehicle photos permanently shrunk: ${vehiclePhotosOptimizedCount}`);
    console.log(`   - KYC images permanently shrunk: ${kycOptimizedCount}`);
    console.log(`   - Total Storage Space Freed: ${formatKB(totalStorageSaved)}`);
    console.log("=================================================");

  } catch (error) {
    console.error("❌ Migration failed with error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  }
}

run();

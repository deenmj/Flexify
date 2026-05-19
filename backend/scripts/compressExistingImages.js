// backend/scripts/compressExistingImages.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/flexify";

console.log("=================================================");
console.log("  Flexify Image Optimization Migration Script    ");
console.log("=================================================");

function optimizeCloudinaryUrl(url, targetWidth = 1280) {
  if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) {
    return url;
  }
  
  // If it already has our dynamic transformation, return it
  if (url.includes('q_auto,f_auto') || url.includes('q_auto:good')) {
    return url;
  }
  
  // Regex to match the /upload/ section and optionally any existing transformation parameters before the version number (starts with /v)
  // Examples: 
  // /upload/v1570598735 -> matches, group 1 is 'v1570598735'
  // /upload/w_1200,h_800,c_limit/v1570598735 -> matches, group 1 is 'v1570598735'
  const uploadRegex = /\/upload\/(?:[^\/]+\/)?(v\d+)/;
  const replacement = `/upload/q_auto,f_auto,w_${targetWidth},c_limit/$1`;
  
  if (uploadRegex.test(url)) {
    return url.replace(uploadRegex, replacement);
  }
  
  // Fallback if no version number is present (just append right after /upload/)
  return url.replace('/upload/', `/upload/q_auto,f_auto,w_${targetWidth},c_limit/`);
}

async function run() {
  try {
    console.log(`Connecting to MongoDB at: ${MONGO_URI.replace(/:([^:@]+)@/, ":****@")}...`);
    await mongoose.connect(MONGO_URI);
    console.log("✅ Successfully connected to MongoDB database.");

    let usersUpdated = 0;
    let kycUrlsOptimized = 0;

    // 1. Optimize User KYC Documents
    console.log("\n--- Optimizing Renter & Owner KYC Documents ---");
    const users = await User.find({
      $or: [
        { "documents.nicFront": { $regex: "res.cloudinary.com" } },
        { "documents.nicBack": { $regex: "res.cloudinary.com" } },
        { "documents.license": { $regex: "res.cloudinary.com" } },
        { "documents.selfie": { $regex: "res.cloudinary.com" } }
      ]
    });

    console.log(`Found ${users.length} users with Cloudinary KYC documents.`);

    for (const user of users) {
      let isModified = false;
      const docs = ['nicFront', 'nicBack', 'license', 'selfie'];
      
      for (const field of docs) {
        if (user.documents && user.documents[field]) {
          const originalUrl = user.documents[field];
          const optimizedUrl = optimizeCloudinaryUrl(originalUrl, 1600); // 1600px max for KYC documents
          
          if (originalUrl !== optimizedUrl) {
            user.documents[field] = optimizedUrl;
            kycUrlsOptimized++;
            isModified = true;
          }
        }
      }

      if (isModified) {
        // Use markModified since documents is a subdocument / mixed schema
        user.markModified('documents');
        await user.save();
        usersUpdated++;
      }
    }

    console.log(`✅ KYC Migration Complete! Updated ${usersUpdated} users and optimized ${kycUrlsOptimized} KYC image URLs.`);

    // 2. Optimize Vehicle Photos
    console.log("\n--- Optimizing Vehicle Listing Photos ---");
    const vehicles = await Vehicle.find({
      "photos.url": { $regex: "res.cloudinary.com" }
    });

    console.log(`Found ${vehicles.length} vehicles with Cloudinary photos.`);

    let vehiclesUpdated = 0;
    let vehiclePhotosOptimized = 0;

    for (const vehicle of vehicles) {
      let isModified = false;
      
      const updatedPhotos = vehicle.photos.map(photo => {
        const originalUrl = photo.url;
        const optimizedUrl = optimizeCloudinaryUrl(originalUrl, 1280); // 1280px max for vehicle photos
        
        if (originalUrl !== optimizedUrl) {
          vehiclePhotosOptimized++;
          isModified = true;
          return {
            ...photo.toObject(),
            url: optimizedUrl
          };
        }
        return photo;
      });

      if (isModified) {
        vehicle.photos = updatedPhotos;
        await vehicle.save();
        vehiclesUpdated++;
      }
    }

    console.log(`✅ Vehicle Photos Migration Complete! Updated ${vehiclesUpdated} vehicles and optimized ${vehiclePhotosOptimized} photo URLs.`);
    
    console.log("\n=================================================");
    console.log("🎉 SUCCESS: All database image URLs optimized!");
    console.log(`   - Users migrated: ${usersUpdated}`);
    console.log(`   - KYC URLs updated: ${kycUrlsOptimized}`);
    console.log(`   - Vehicles migrated: ${vehiclesUpdated}`);
    console.log(`   - Vehicle photos updated: ${vehiclePhotosOptimized}`);
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

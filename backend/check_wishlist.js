import mongoose from "mongoose";
import User from "./models/User.js";
import Vehicle from "./models/Vehicle.js";
import VehicleSale from "./models/VehicleSale.js";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");
  
  // Find a user with some wishlist items
  const user = await User.findOne({ 
    $or: [
      { 'rentWishlist.0': { $exists: true } },
      { 'saleWishlist.0': { $exists: true } }
    ]
  }).populate("rentWishlist").populate("saleWishlist");
  
  if (!user) {
    console.log("No user found with any wishlist items");
  } else {
    console.log("User email:", user.email);
    console.log("Rent Wishlist populated:", user.rentWishlist);
    console.log("Sale Wishlist populated:", user.saleWishlist);
  }
  
  mongoose.disconnect();
}

check();

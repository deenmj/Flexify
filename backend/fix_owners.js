import mongoose from "mongoose";
import dotenv from "dotenv";
import Vehicle from "./models/Vehicle.js";
import Staff from "./models/Staff.js";

dotenv.config({ path: ".env.development" });

async function fixOwners() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");
    
    // Find all staff IDs
    const staffIds = await Staff.find().distinct("_id");
    console.log(`Found ${staffIds.length} staff members`);
    
    // Update all vehicles where owner is in staffIds to have ownerModel = 'Staff'
    const result = await Vehicle.updateMany(
      { owner: { $in: staffIds }, ownerModel: "User" },
      { $set: { ownerModel: "Staff" } }
    );
    
    console.log(`Updated ${result.modifiedCount} orphaned vehicles.`);
    
    await mongoose.disconnect();
    console.log("Disconnected from DB");
  } catch (err) {
    console.error(err);
  }
}

fixOwners();

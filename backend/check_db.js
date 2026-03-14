import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Vehicle from "./models/Vehicle.js";
import User from "./models/User.js";

async function checkVehicles() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/flexify");
    console.log("Connected to DB");

    const allVehicles = await Vehicle.find({});
    console.log(`Total vehicles in DB: ${allVehicles.length}`);

    const activeVehicles = await Vehicle.find({ status: "active", isActive: true });
    console.log(`Active & Visible vehicles: ${activeVehicles.length}`);

    if (allVehicles.length > 0) {
      console.log("Details of first 2 vehicles:");
      allVehicles.slice(0, 2).forEach(v => {
        console.log(`- Title: ${v.title}, Status: ${v.status}, isActive: ${v.isActive}, Owner: ${v.owner}`);
      });
      
      const ownerId = allVehicles[0].owner;
      const owner = await User.findById(ownerId);
      if (owner) {
          console.log(`Owner ${owner.name} subscription:`, JSON.stringify(owner.subscription, null, 2));
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkVehicles();

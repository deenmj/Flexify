import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import User from "./models/User.js";
import Vehicle from "./models/Vehicle.js";

async function debug() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const v = await Vehicle.findOne({status: 'active'});
        if (!v) {
            console.log("No active vehicles found at all");
            const all = await Vehicle.find({});
            console.log(`Total vehicles: ${all.length}`);
            if (all.length > 0) console.log("First vehicle status:", all[0].status);
            process.exit(0);
        }
        console.log("Found vehicle:", v.title, "Owner ID:", v.owner);
        const owner = await User.findById(v.owner);
        if (!owner) {
            console.log("Owner not found in Users collection!");
            // Check if collection name is different
            const cols = await mongoose.connection.db.listCollections().toArray();
            console.log("Collections:", cols.map(c => c.name));
        } else {
            console.log("Owner found:", owner.name);
            console.log("Owner Sub Status:", owner.subscription.status);
            console.log("Owner Sub Tier:", owner.subscription.tier);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
debug();

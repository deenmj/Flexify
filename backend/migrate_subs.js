import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import User from "./models/User.js";

async function migrateSubscriptions() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb+srv://marketvendor_auth_db_user:CVlYjrQ55dvWadH8@flexifyrental.wuhrwxx.mongodb.net/?appName=flexifyRental");
    console.log("Connected to DB");

    // Fix status to lowercase and ensure tier is valid
    const users = await User.find({ "subscription.status": "ACTIVE" });
    console.log(`Found ${users.length} users with uppercase ACTIVE status`);

    for (let user of users) {
      user.subscription.status = "active";
      if (!['FREE', 'BASIC', 'STANDARD', 'ENTERPRISE'].includes(user.subscription.tier)) {
          user.subscription.tier = 'FREE';
      }
      await user.save();
    }

    console.log("Migration completed");
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

migrateSubscriptions();

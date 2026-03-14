import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import User from "./models/User.js";

async function forceUpdateSubscriptions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    // All users that don't have a subscription object or have it malformed
    const users = await User.find({});
    console.log(`Checking ${users.length} users`);

    let updatedCount = 0;
    for (let user of users) {
      if (!user.subscription || !user.subscription.status) {
        user.subscription = {
          tier: 'FREE',
          status: 'active',
          startDate: new Date(),
          endDate: null
        };
        await user.save();
        updatedCount++;
      } else if (user.subscription.status === 'ACTIVE') {
          user.subscription.status = 'active';
          await user.save();
          updatedCount++;
      }
    }

    console.log(`Updated ${updatedCount} users.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

forceUpdateSubscriptions();

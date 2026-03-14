import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Vehicle from "./models/Vehicle.js";

async function debugAggregation() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    const now = new Date();
    const filter = {
      status: "active",
      isActive: true,
    };

    console.log("Step 1: Match filter", filter);
    const step1 = await Vehicle.find(filter);
    console.log(`Step 1 results: ${step1.length}`);

    console.log("Step 2: Lookup users");
    const step2 = await Vehicle.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "ownerInfo"
        }
      }
    ]);
    console.log(`Step 2 results: ${step2.length}`);
    if (step2.length > 0) {
        console.log(`First ownerInfo found: ${step2[0].ownerInfo.length > 0}`);
        if (step2[0].ownerInfo.length > 0) {
            console.log("Subscription status:", step2[0].ownerInfo[0].subscription.status);
        }
    }

    console.log("Step 3: Unwind and Match subscription");
    const step3 = await Vehicle.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "ownerInfo"
        }
      },
      { $unwind: "$ownerInfo" },
      {
        $match: {
          $or: [
            { "ownerInfo.subscription.status": "active" },
            { "ownerInfo.subscription.status": "trial" },
          ]
        }
      }
    ]);
    console.log(`Step 3 results: ${step3.length}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

debugAggregation();

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Vehicle from "./models/Vehicle.js";
import User from "./models/User.js";

async function testControllerAggregation() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    const now = new Date();
    let filter = {
      status: "active",
      isActive: true,
    };

    console.log("Running aggregation with filter:", filter);

    const vehicles = await Vehicle.aggregate([
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
            { 
              "ownerInfo.subscription.status": "expired",
              "ownerInfo.subscription.gracePeriodEnd": { $gte: now }
            }
          ]
        }
      },
      {
        $addFields: {
          tierBoost: {
            $switch: {
              branches: [
                { case: { $eq: ["$ownerInfo.subscription.tier", "ENTERPRISE"] }, then: 100 },
                { case: { $eq: ["$ownerInfo.subscription.tier", "STANDARD"] }, then: 50 },
                { case: { $eq: ["$ownerInfo.subscription.tier", "BASIC"] }, then: 10 }
              ],
              default: 0
            }
          }
        }
      },
      { $sort: { tierBoost: -1, createdAt: -1 } },
      {
        $project: {
          _id: 1,
          owner: {
            _id: "$ownerInfo._id",
            name: "$ownerInfo.name",
            email: "$ownerInfo.email",
            profilePic: "$ownerInfo.profilePic",
            ownerType: "$ownerInfo.ownerType",
            subscription: "$ownerInfo.subscription"
          },
          title: 1,
          make: 1,
          model: 1,
          year: 1,
          photos: 1,
          location: 1,
          pricePerDay: 1,
          transmission: 1,
          fuelType: 1,
          seats: 1,
          description: 1,
          serviceType: 1,
          status: 1,
          isActive: 1,
          timesRented: 1,
          averageRating: 1,
          reviewCount: 1,
          createdAt: 1
        }
      }
    ]);

    console.log(`Aggregation result count: ${vehicles.length}`);
    if (vehicles.length > 0) {
        console.log("First vehicle:", vehicles[0].title);
    } else {
        // Find why it failed
        const match1 = await Vehicle.find(filter);
        console.log(`Match phase 1 results: ${match1.length}`);
        
        if (match1.length > 0) {
            const lookupRes = await Vehicle.aggregate([
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
            console.log(`Lookup phase results: ${lookupRes.length}`);
            if (lookupRes.length > 0) {
                console.log("Owner info found in first result:", lookupRes[0].ownerInfo.length);
                if (lookupRes[0].ownerInfo.length > 0) {
                    console.log("Subscription:", JSON.stringify(lookupRes[0].ownerInfo[0].subscription, null, 2));
                }
            }
        }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

testControllerAggregation();

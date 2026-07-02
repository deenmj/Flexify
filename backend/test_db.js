import mongoose from "mongoose";
import dotenv from "dotenv";
import Vehicle from "./models/Vehicle.js";
import Staff from "./models/Staff.js";
import User from "./models/User.js";

dotenv.config({ path: ".env.development" });

async function testPipeline() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      {
        $lookup: {
          from: "staffs",
          localField: "owner",
          foreignField: "_id",
          as: "staffInfo"
        }
      },
      {
        $addFields: {
          ownerInfoArr: { $concatArrays: ["$userInfo", "$staffInfo"] }
        }
      },
      { $unwind: "$ownerInfoArr" },
      { $addFields: { ownerInfo: "$ownerInfoArr" } },
    ];
    
    const results = await Vehicle.aggregate(pipeline);
    console.log(`Found ${results.length} vehicles using pipeline.`);
    if (results.length > 0) {
      console.log("First owner:", results[0].ownerInfo?.name);
    } else {
      // debug without match
      const debugPipeline = pipeline.slice(0, 3);
      const debugResults = await Vehicle.aggregate(debugPipeline);
      console.log(`Without match: found ${debugResults.length} vehicles.`);
      if (debugResults.length > 0) {
        console.log("Debug first vehicle userInfo size:", debugResults[0].userInfo.length);
        console.log("Debug first vehicle staffInfo size:", debugResults[0].staffInfo.length);
        console.log("Debug first vehicle ownerInfo:", debugResults[0].ownerInfo ? 'exists' : 'null');
      }
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

testPipeline();

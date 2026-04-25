/**
 * Migration Script: Update subscription tiers from old to new structure
 * 
 * Old: BASIC (2 vehicles) / STANDARD (6 vehicles) / ENTERPRISE (unlimited)
 * New: FREE (2 vehicles) / STANDARD (8 vehicles) / PRO (unlimited)
 * 
 * Old status: trial / active / expired
 * New status: free / active / expired
 * 
 * Run with: node --experimental-modules backend/scripts/migrateTiers.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const User = mongoose.connection.collection("users");

    // 1. BASIC → FREE (trial status → free)
    const basicResult = await User.updateMany(
      { "subscription.tier": "BASIC" },
      { 
        $set: { 
          "subscription.tier": "FREE",
          "subscription.status": "free",
          "subscription.endDate": null
        } 
      }
    );
    console.log(`📦 BASIC → FREE: ${basicResult.modifiedCount} users updated`);

    // 2. ENTERPRISE → PRO
    const enterpriseResult = await User.updateMany(
      { "subscription.tier": "ENTERPRISE" },
      { $set: { "subscription.tier": "PRO" } }
    );
    console.log(`📦 ENTERPRISE → PRO: ${enterpriseResult.modifiedCount} users updated`);

    // 3. trial status → free status (for any remaining trial users)
    const trialResult = await User.updateMany(
      { "subscription.status": "trial" },
      { 
        $set: { 
          "subscription.status": "free",
          "subscription.tier": "FREE",
          "subscription.endDate": null
        } 
      }
    );
    console.log(`📦 trial → free: ${trialResult.modifiedCount} users updated`);

    // 4. STANDARD stays STANDARD (no change needed for tier name)
    // But update vehicle limit awareness (handled in code, not DB)

    console.log("\n✅ Migration complete!");
    console.log("Tier structure is now: FREE / STANDARD / PRO");
    
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration Error:", err);
    process.exit(1);
  }
};

run();

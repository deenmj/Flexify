import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function rawMongoUpdate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    const usersCol = mongoose.connection.db.collection('users');
    
    // 1. Where subscription field is missing
    const res1 = await usersCol.updateMany(
      { subscription: { $exists: false } },
      { $set: { subscription: { tier: 'FREE', status: 'active', startDate: new Date(), endDate: null } } }
    );
    console.log("Missing subscription update:", res1.modifiedCount);

    // 2. Where status is ACTIVE (uppercase)
    const res2 = await usersCol.updateMany(
      { "subscription.status": "ACTIVE" },
      { $set: { "subscription.status": "active" } }
    );
    console.log("Uppercase status update:", res2.modifiedCount);

    // 3. Where tier is missing (but object exists)
    const res3 = await usersCol.updateMany(
      { "subscription.tier": { $exists: false }, "subscription": { $exists: true } },
      { $set: { "subscription.tier": "FREE" } }
    );
    console.log("Missing tier update:", res3.modifiedCount);

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

rawMongoUpdate();

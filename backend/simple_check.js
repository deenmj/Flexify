import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import User from "./models/User.js";

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({});
    users.forEach(u => {
        console.log(`User: ${u.name}, Tier: ${u.subscription.tier}, Status: ${u.subscription.status}`);
    });
    process.exit(0);
}
run();

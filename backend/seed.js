import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

const seedProductionAdmins = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("MONGO_URI is missing in .env");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for Production Seeding");

    // Clear any existing users to guarantee clean slate
    await User.deleteMany();
    console.log("Cleared existing users...");

    // 1. SUPERADMIN
    const admin = {
      name: "Super Admin",
      email: "admin@flexify.com",
      password: "Admin@123",
      role: "superadmin",
      status: "active",
      verificationStatus: "approved",
      profilePic: "https://i.pravatar.cc/150?img=11",
      createdAt: new Date(),
    };

    const staff1 = {
      name: "John Staff",
      email: "staff1@flexify.com",
      password: "staff@123",
      role: "subadmin",
      status: "active",
      permissions: ["users_read", "bookings_read"],
      verificationStatus: "approved",
      profilePic: "https://i.pravatar.cc/150?img=12",
      createdAt: new Date(),
    };

    const staff2 = {
      name: "Jane Staff",
      email: "staff2@flexify.com",
      password: "staff@123",
      role: "subadmin",
      status: "active",
      permissions: ["vehicles_read", "payments_read"],
      verificationStatus: "approved",
      profilePic: "https://i.pravatar.cc/150?img=5",
      createdAt: new Date(),
    };

    await User.insertMany([admin, staff1, staff2]);

    console.log("✅ Main Admin & Staff accounts seeded successfully!");
    console.log("-----------------------------------------");
    console.log("SUPERADMIN: admin@flexify.com   | Admin@123");
    console.log("STAFF 1:    staff1@flexify.com  | staff@123");
    console.log("STAFF 2:    staff2@flexify.com  | staff@123");
    console.log("──────────────────────────────────────\n");

    process.exit(0);
  } catch (error) {
    console.error("Seeding Error:", error);
    process.exit(1);
  }
};

seedProductionAdmins();

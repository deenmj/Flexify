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
    await User.create({
      name: "Super Admin",
      email: "admin@flexify.com",
      password: "password123",
      role: "superadmin",
      verified: true,
      isKycVerified: true,
      verificationStatus: "approved",
      status: "active",
      phone: "+94 77 000 0001",
    });

    // 2. STAFF 1
    await User.create({
      name: "Staff Member 1",
      email: "staff1@flexify.com",
      password: "password123",
      role: "subadmin",
      verified: true,
      isKycVerified: true,
      verificationStatus: "approved",
      status: "active",
      phone: "+94 77 000 0002",
    });

    // 3. STAFF 2
    await User.create({
      name: "Staff Member 2",
      email: "staff2@flexify.com",
      password: "password123",
      role: "subadmin",
      verified: true,
      isKycVerified: true,
      verificationStatus: "approved",
      status: "active",
      phone: "+94 77 000 0003",
    });

    console.log("\n========================================");
    console.log("Production Admin Accounts Created!");
    console.log("========================================");
    console.log("SUPERADMIN: admin@flexify.com   | password123");
    console.log("STAFF 1:    staff1@flexify.com  | password123");
    console.log("STAFF 2:    staff2@flexify.com  | password123");
    console.log("──────────────────────────────────────\n");

    process.exit(0);
  } catch (error) {
    console.error("Seeding Error:", error);
    process.exit(1);
  }
};

seedProductionAdmins();

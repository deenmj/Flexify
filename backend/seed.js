import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Vehicle from "./models/Vehicle.js";
import Booking from "./models/Booking.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

const seedDatabase = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("MONGO_URI is missing in .env");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for Seeding");

    await User.deleteMany();
    await Vehicle.deleteMany();
    await Booking.deleteMany();
    console.log("Cleared existing data...");

    // ========== USERS ==========

    // 1. SUPERADMIN
    const superadmin = await User.create({
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

    // 2. SUBADMIN
    const subadmin = await User.create({
      name: "Staff Reviewer",
      email: "staff@flexify.com",
      password: "password123",
      role: "subadmin",
      verified: true,
      isKycVerified: true,
      verificationStatus: "approved",
      status: "active",
      phone: "+94 77 000 0002",
    });

    // 3. VERIFIED OWNER
    const verifiedOwner = await User.create({
      name: "Luxury Motors",
      email: "luxury@flexify.com",
      password: "password123",
      role: "owner",
      ownerType: "VERIFIED",
      verified: true,
      isKycVerified: true,
      verificationStatus: "approved",
      status: "active",
      phone: "+94 77 123 4567",
      profilePic: "https://ui-avatars.com/api/?name=Luxury+Motors&background=0D8ABC&color=fff",
    });

    // 4. UNVERIFIED OWNER
    const unverifiedOwner = await User.create({
      name: "Budget Rides",
      email: "budget@flexify.com",
      password: "password123",
      role: "owner",
      ownerType: "UNVERIFIED",
      verified: true,
      isKycVerified: false,
      verificationStatus: "not_submitted",
      status: "active",
      phone: "+94 71 987 6543",
      profilePic: "https://ui-avatars.com/api/?name=Budget+Rides&background=F59E0B&color=fff",
    });

    // 5. VERIFIED USER (KYC approved — can book)
    const verifiedUser = await User.create({
      name: "Kamal Perera",
      email: "kamal@flexify.com",
      password: "password123",
      role: "user",
      verified: true,
      isKycVerified: true,
      verificationStatus: "approved",
      status: "active",
      phone: "+94 76 555 1234",
      documents: {
        nicFront: "",
        nicBack: "",
        license: "",
        selfie: "",
        address: "123 Galle Road, Colombo 03",
      },
    });

    // 6. UNVERIFIED USER (needs KYC — cannot book)
    const unverifiedUser = await User.create({
      name: "Nimal Silva",
      email: "nimal@flexify.com",
      password: "password123",
      role: "user",
      verified: true,
      isKycVerified: false,
      verificationStatus: "not_submitted",
      status: "active",
    });

    // 7. USER with PENDING KYC
    const pendingUser = await User.create({
      name: "Saman Kumara",
      email: "saman@flexify.com",
      password: "password123",
      role: "user",
      verified: true,
      isKycVerified: false,
      verificationStatus: "pending",
      status: "active",
      phone: "+94 71 222 3333",
      documents: {
        nicFront: "/uploads/verification/sample-nic-front.jpg",
        nicBack: "/uploads/verification/sample-nic-back.jpg",
        license: "/uploads/verification/sample-license.jpg",
        selfie: "/uploads/verification/sample-selfie.jpg",
        address: "45 Temple Road, Kandy",
      },
    });

    console.log("Users Seeded");

    // ========== VEHICLES ==========
    await Vehicle.insertMany([
      {
        owner: verifiedOwner._id,
        title: "Honda Civic Sedan",
        make: "Honda",
        model: "Civic",
        year: 2022,
        photos: ["https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800"],
        location: {
          type: "Point",
          coordinates: [79.8612, 6.9271],
          address: "Colombo, Sri Lanka",
        },
        pricePerDay: 6000,
        transmission: "Automatic",
        fuelType: "Petrol",
        seats: 5,
        description: "Comfortable and reliable Honda Civic for smooth city rides.",
        status: "active",
        isActive: true,
        serviceType: ["Car"], // Category: Car
      },
      {
        owner: verifiedOwner._id,
        title: "Toyota Prado TX",
        make: "Toyota",
        model: "Prado",
        year: 2021,
        photos: ["https://images.unsplash.com/photo-1535224206242-487f7090b4bb?auto=format&fit=crop&q=80&w=800"],
        location: {
          type: "Point",
          coordinates: [80.6337, 7.2906],
          address: "Kandy, Sri Lanka",
        },
        pricePerDay: 18000,
        transmission: "Automatic",
        fuelType: "Diesel",
        seats: 7,
        description: "Powerful SUV perfect for both city driving and off-road trips.",
        status: "active",
        isActive: true,
        serviceType: ["SUV"], // Category: SUV
      },
      {
        owner: verifiedOwner._id,
        title: "Nissan Caravan",
        make: "Nissan",
        model: "Caravan",
        year: 2019,
        photos: ["https://images.unsplash.com/photo-1559405624-9b25da119bc1?auto=format&fit=crop&q=80&w=800"],
        location: {
          type: "Point",
          coordinates: [80.2210, 6.0535],
          address: "Galle, Sri Lanka",
        },
        pricePerDay: 12000,
        transmission: "Manual",
        fuelType: "Diesel",
        seats: 12,
        description: "Spacious van suitable for large groups and family trips.",
        status: "active",
        isActive: true,
        serviceType: ["Van"], // Category: Van
      },
      {
        owner: verifiedOwner._id,
        title: "Yamaha FZ v3",
        make: "Yamaha",
        model: "FZ",
        year: 2023,
        photos: ["https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800"],
        location: {
          type: "Point",
          coordinates: [80.0100, 9.6615],
          address: "Jaffna, Sri Lanka",
        },
        pricePerDay: 2500,
        transmission: "Manual",
        fuelType: "Petrol",
        seats: 2,
        description: "Sporty and agile bike for navigating through traffic quickly.",
        status: "active",
        isActive: true,
        serviceType: ["Bike"], // Category: Bike
      },
      {
        owner: verifiedOwner._id,
        title: "Isuzu Elf Truck",
        make: "Isuzu",
        model: "Elf",
        year: 2018,
        photos: ["https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&q=80&w=800"],
        location: {
          type: "Point",
          coordinates: [79.8358, 7.2104],
          address: "Negombo, Sri Lanka",
        },
        pricePerDay: 15000,
        transmission: "Manual",
        fuelType: "Diesel",
        seats: 3,
        description: "Reliable truck capable of handling heavy cargo transportation.",
        status: "active",
        isActive: true,
        serviceType: ["Truck"], // Category: Truck
      },
    ]);

    console.log("Vehicles Seeded");

    console.log("\n========================================");
    console.log("Database Seed completed successfully!");
    console.log("========================================");
    console.log("\nTest Accounts:");
    console.log("──────────────────────────────────────");
    console.log("SUPERADMIN: admin@flexify.com     | password123");
    console.log("SUBADMIN:   staff@flexify.com     | password123");
    console.log("VER.OWNER:  luxury@flexify.com    | password123");
    console.log("UNVER.OWNER:budget@flexify.com    | password123");
    console.log("VER.USER:   kamal@flexify.com     | password123");
    console.log("UNVER.USER: nimal@flexify.com     | password123");
    console.log("PENDING:    saman@flexify.com     | password123");
    console.log("──────────────────────────────────────\n");

    process.exit(0);
  } catch (error) {
    console.error("Seeding Error:", error);
    process.exit(1);
  }
};

seedDatabase();

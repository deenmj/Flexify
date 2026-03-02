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
        title: "Tesla Model S Plaid",
        make: "Tesla",
        model: "Model S",
        year: 2024,
        photos: ["https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80&w=800"],
        location: {
          type: "Point",
          coordinates: [79.8612, 6.9271],
          address: "Colombo, Sri Lanka",
        },
        pricePerDay: 15000,
        transmission: "Automatic",
        fuelType: "Electric",
        seats: 5,
        description: "Experience the pinnacle of electric performance with the Tesla Model S Plaid in the heart of Colombo.",
        status: "active",
        isActive: true,
        serviceType: ["Luxury", "Electric"],
      },
      {
        owner: verifiedOwner._id,
        title: "Mercedes-Benz S-Class",
        make: "Mercedes-Benz",
        model: "S-Class",
        year: 2023,
        photos: ["https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=800"],
        location: {
          type: "Point",
          coordinates: [80.6337, 7.2906],
          address: "Kandy, Sri Lanka",
        },
        pricePerDay: 18000,
        transmission: "Automatic",
        fuelType: "Petrol",
        seats: 4,
        description: "Ultimate luxury and comfort for your journey through the scenic hills of Kandy.",
        status: "active",
        isActive: true,
        serviceType: ["Luxury", "Chauffeur"],
      },
      {
        owner: verifiedOwner._id,
        title: "Toyota Prius Hybrid",
        make: "Toyota",
        model: "Prius",
        year: 2022,
        photos: ["https://images.unsplash.com/photo-1621007947382-bb3c3994e3fd?auto=format&fit=crop&q=80&w=800"],
        location: {
          type: "Point",
          coordinates: [80.2210, 6.0535],
          address: "Galle, Sri Lanka",
        },
        pricePerDay: 5000,
        transmission: "Automatic",
        fuelType: "Hybrid",
        seats: 5,
        description: "Reliable and fuel-efficient, perfect for coastal drives in Galle.",
        status: "active",
        isActive: true,
        serviceType: ["Economy", "Hybrid"],
      },
      {
        owner: unverifiedOwner._id,
        title: "Honda CR-V",
        make: "Honda",
        model: "CR-V",
        year: 2021,
        photos: ["https://images.unsplash.com/photo-1566367576585-051280dd0ec0?auto=format&fit=crop&q=80&w=800"],
        location: {
          type: "Point",
          coordinates: [80.0100, 9.6615],
          address: "Jaffna, Sri Lanka",
        },
        pricePerDay: 8000,
        transmission: "Automatic",
        fuelType: "Petrol",
        seats: 5,
        description: "Compact SUV with great cargo space, ideal for exploring Jaffna.",
        status: "pending", // Unverified owner → pending approval
        isActive: true,
        serviceType: ["SUV", "Family"],
      },
      {
        owner: unverifiedOwner._id,
        title: "Ford Transit Van",
        make: "Ford",
        model: "Transit",
        year: 2020,
        photos: ["https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=800"],
        location: {
          type: "Point",
          coordinates: [79.8358, 7.2104],
          address: "Negombo, Sri Lanka",
        },
        pricePerDay: 6000,
        transmission: "Manual",
        fuelType: "Diesel",
        seats: 2,
        description: "Perfect for moving day or transporting large loads in Negombo.",
        status: "pending", // Unverified owner → pending approval
        isActive: true,
        serviceType: ["Commercial", "Van"],
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

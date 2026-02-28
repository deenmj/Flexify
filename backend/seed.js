import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Vehicle from "./models/Vehicle.js";
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
    console.log("Cleared existing data...");

    // Create Admin and Owners
    const admin = await User.create({
      name: "Admin User",
      email: "admin@flexify.com",
      password: "password123", // Hashes automatically via schema
      role: "admin",
      verified: true,
      status: "active",
      dashboardCreated: true
    });

    const owner1 = await User.create({
      name: "Luxury Motors",
      email: "luxury@flexify.com",
      password: "password123",
      role: "verifiedOwner",
      verified: true,
      status: "active",
      profilePic: "https://ui-avatars.com/api/?name=Luxury+Motors&background=0D8ABC&color=fff",
      dashboardCreated: true
    });

    const owner2 = await User.create({
      name: "Budget Rides",
      email: "budget@flexify.com",
      password: "password123",
      role: "owner",
      verified: true,
      status: "active",
      profilePic: "https://ui-avatars.com/api/?name=Budget+Rides&background=F59E0B&color=fff",
      dashboardCreated: true
    });
    
    // User
    const user1 = await User.create({
      name: "John Doe",
      email: "john@flexify.com",
      password: "password123",
      role: "user",
      status: "active"
    });

    console.log("Users Seeded");

    // Subscription dates
    const activeSub = new Date();
    activeSub.setMonth(activeSub.getMonth() + 1);

    // Create Vehicles
    await Vehicle.insertMany([
      {
        owner: owner1._id,
        title: "Tesla Model S Plaid",
        make: "Tesla",
        model: "Model S",
        year: 2024,
        photos: ["https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80&w=800"],
        location: {
          type: "Point",
          coordinates: [-122.4194, 37.7749], // San Francisco
          address: "San Francisco, CA"
        },
        pricePerDay: 250,
        transmission: "Automatic",
        fuelType: "Electric",
        seats: 5,
        description: "Experience the pinnacle of electric performance with the Tesla Model S Plaid. 0-60 in under 2 seconds.",
        isActive: true,
        approved: true,
        subscribedUntil: activeSub,
        serviceType: ["Luxury", "Electric"]
      },
      {
        owner: owner1._id,
        title: "Mercedes-Benz S-Class",
        make: "Mercedes-Benz",
        model: "S-Class",
        year: 2023,
        photos: ["https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=800"],
        location: {
          type: "Point",
          coordinates: [-118.2437, 34.0522], // Los Angeles
          address: "Los Angeles, CA"
        },
        pricePerDay: 300,
        transmission: "Automatic",
        fuelType: "Petrol",
        seats: 4,
        description: "Ultimate luxury and comfort. Perfect for executives, special events, or just cruising in total elegance.",
        isActive: true,
        approved: true,
        subscribedUntil: activeSub,
        serviceType: ["Luxury", "chauffeur"]
      },
      {
        owner: owner2._id,
        title: "Toyota Camry Hybrid",
        make: "Toyota",
        model: "Camry",
        year: 2022,
        photos: ["https://images.unsplash.com/photo-1621007947382-bb3c3994e3fd?auto=format&fit=crop&q=80&w=800"],
        location: {
          type: "Point",
          coordinates: [-74.0060, 40.7128], // New York
          address: "New York, NY"
        },
        pricePerDay: 45,
        transmission: "Automatic",
        fuelType: "Hybrid",
        seats: 5,
        description: "Extremely reliable and fuel-efficient. Great for city commuting or long road trips.",
        isActive: true,
        approved: true,
        subscribedUntil: activeSub,
        serviceType: ["Economy", "Hybrid"]
      },
      {
        owner: owner2._id,
        title: "Ford Transit Van",
        make: "Ford",
        model: "Transit",
        year: 2020,
        photos: ["https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=800"],
        location: {
          type: "Point",
          coordinates: [-87.6298, 41.8781], // Chicago
          address: "Chicago, IL"
        },
        pricePerDay: 90,
        transmission: "Automatic",
        fuelType: "Diesel",
        seats: 2,
        description: "Perfect for moving day or transporting large loads. Lots of cargo space.",
        isActive: true,
        approved: true,
        subscribedUntil: activeSub,
        serviceType: ["Commercial", "Van"]
      },
      {
        owner: owner2._id,
        title: "Honda CR-V",
        make: "Honda",
        model: "CR-V",
        year: 2021,
        photos: ["https://images.unsplash.com/photo-1566367576585-051280dd0ec0?auto=format&fit=crop&q=80&w=800"],
        location: {
          type: "Point",
          coordinates: [-122.4194, 37.7749], // SF
          address: "San Francisco, CA"
        },
        pricePerDay: 65,
        transmission: "Automatic",
        fuelType: "Petrol",
        seats: 5,
        description: "Compact SUV with great cargo space and visibility. A top choice for families.",
        isActive: true,
        approved: true,
        subscribedUntil: activeSub,
        serviceType: ["SUV", "Family"]
      }
    ]);

    console.log("Vehicles Seeded");

    console.log("Database Seed completed successfully!");
    console.log("Admin Email: admin@flexify.com | Password: password123");
    console.log("Owner Email: luxury@flexify.com | Password: password123");
    console.log("User Email: john@flexify.com | Password: password123");
    process.exit(0);
  } catch (error) {
    console.error("Seeding Error:", error);
    process.exit(1);
  }
};

seedDatabase();

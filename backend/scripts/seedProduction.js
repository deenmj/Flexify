import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import Booking from '../models/booking.js';
import VehicleMake from '../models/VehicleMake.js';
import VehicleModel from '../models/VehicleModel.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI is not defined in .env');
  process.exit(1);
}

const seedData = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // 1. Clear existing data (Optional - use with caution)
    // await User.deleteMany({});
    // await Vehicle.deleteMany({});
    // await Booking.deleteMany({});

    // 2. Create Sample Users
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('Admin@123', salt);

    // Superadmin
    const superadmin = await User.findOneAndUpdate(
      { email: 'admin@flexify.com' },
      {
        name: 'Super Admin',
        password,
        role: 'superadmin',
        verified: true,
        isKycVerified: true,
        profilePic: 'https://res.cloudinary.com/demo/image/upload/d_avatar.png/personal_avatar.jpg'
      },
      { upsert: true, new: true }
    );

    // Staff 1
    const staff1 = await User.findOneAndUpdate(
      { email: 'staff1@flexify.com' },
      {
        name: 'John Staff',
        password,
        role: 'subadmin',
        verified: true,
        isKycVerified: true,
        permissions: ["users_read", "bookings_read"],
        profilePic: 'https://i.pravatar.cc/150?img=12'
      },
      { upsert: true, new: true }
    );

    // Staff 2
    const staff2 = await User.findOneAndUpdate(
      { email: 'staff2@flexify.com' },
      {
        name: 'Jane Staff',
        password,
        role: 'subadmin',
        verified: true,
        isKycVerified: true,
        permissions: ["vehicles_read", "payments_read"],
        profilePic: 'https://i.pravatar.cc/150?img=5'
      },
      { upsert: true, new: true }
    );

    console.log('--- SEEDING COMPLETE ---');
    process.exit(0);

  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
};

seedData();

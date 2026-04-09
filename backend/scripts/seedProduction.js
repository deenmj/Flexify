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
    const password = await bcrypt.hash('password123', salt);

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

    // Vendor (Owner)
    const vendor = await User.findOneAndUpdate(
      { email: 'vendor@flexify.com' },
      {
        name: 'Flexify Vendor',
        password,
        role: 'owner',
        ownerType: 'VERIFIED',
        verified: true,
        isKycVerified: true,
        subscription: {
          tier: 'ENTERPRISE',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        },
        profilePic: 'https://res.cloudinary.com/demo/image/upload/w_200,h_200,c_fill,g_face/r_max/f_auto/woman-sitting-on-steps.jpg'
      },
      { upsert: true, new: true }
    );

    // Customer (User)
    const customer = await User.findOneAndUpdate(
      { email: 'customer@flexify.com' },
      {
        name: 'Happy Renter',
        password,
        role: 'user',
        verified: true,
        isKycVerified: true,
        profilePic: 'https://res.cloudinary.com/demo/image/upload/w_100,h_100,c_thumb,g_face/r_max/f_auto/young-man-smiling.jpg'
      },
      { upsert: true, new: true }
    );

    console.log('Users seeded successfully');

    // 3. Create Sample Vehicles
    const vehiclesData = [
      {
        title: 'Toyota Prius 2018 - Limited Edition',
        make: 'Toyota',
        model: 'Prius',
        year: 2018,
        pricePerDay: 7500,
        pricePerWeek: 45000,
        pricePerMonth: 160000,
        serviceType: ['Car'],
        transmission: 'Automatic',
        fuelType: 'Hybrid',
        seats: 5,
        engineCapacity: '1800cc',
        fuelConsumption: '25km/L',
        description: 'Excellent fuel consumption and smooth driving experience for city and long trips.',
        photos: ['https://res.cloudinary.com/demo/image/upload/v1642512140/sample/car_toyota.jpg'],
        isActive: true,
        status: 'active',
        province: 'Western',
        district: 'Colombo',
        city: 'Colombo 07',
        features: ['AC', 'Bluetooth', 'GPS', 'Spare Wheel']
      },
      {
        title: 'Mitsubishi Montero Sport V6',
        make: 'Mitsubishi',
        model: 'Montero Sport',
        year: 2020,
        pricePerDay: 45000,
        pricePerWeek: 280000,
        pricePerMonth: 1000000,
        serviceType: ['SUV'],
        transmission: 'Automatic',
        fuelType: 'Diesel',
        seats: 7,
        engineCapacity: '2400cc',
        fuelConsumption: '12km/L',
        description: 'Powerful luxury SUV, perfect for family adventures and off-road experiences.',
        photos: ['https://res.cloudinary.com/demo/image/upload/v1642512140/sample/suv_luxury.jpg'],
        isActive: true,
        status: 'active',
        province: 'Western',
        district: 'Gampaha',
        city: 'Negombo',
        features: ['AC', 'Bluetooth', 'GPS', 'Sunroof', 'Spare Wheel']
      },
      {
        title: 'Honda Hornet 160R',
        make: 'Honda',
        model: 'Hornet',
        year: 2021,
        pricePerDay: 4500,
        serviceType: ['Bike'],
        transmission: 'Manual',
        fuelType: 'Petrol',
        seats: 2,
        engineCapacity: '160cc',
        fuelConsumption: '45km/L',
        description: 'Sporty bike for quick city commutes. Very reliable and fuel-efficient.',
        photos: ['https://res.cloudinary.com/demo/image/upload/v1642512140/sample/motorcycle.jpg'],
        isActive: true,
        status: 'active',
        province: 'Southern',
        district: 'Galle',
        city: 'Hikkaduwa',
        features: ['Spare Wheel']
      }
    ];

    const seededVehicles = [];
    for (const v of vehiclesData) {
      const vehicle = await Vehicle.findOneAndUpdate(
        { title: v.title },
        { ...v, owner: vendor._id },
        { upsert: true, new: true }
      );
      seededVehicles.push(vehicle);
    }

    console.log('Vehicles seeded successfully');

    // 4. Create Sample Bookings
    const bookingsData = [
      {
        user: customer._id,
        vehicle: seededVehicles[0]._id,
        owner: vendor._id,
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // In 2 days
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),   // Until 5 days from now
        days: 3,
        totalAmount: 22500,
        status: 'CONFIRMED'
      },
      {
        user: customer._id,
        vehicle: seededVehicles[1]._id,
        owner: vendor._id,
        startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        days: 2,
        totalAmount: 90000,
        status: 'PENDING'
      }
    ];

    for (const b of bookingsData) {
      await Booking.findOneAndUpdate(
        { user: b.user, vehicle: b.vehicle, startDate: b.startDate },
        b,
        { upsert: true }
      );
    }

    console.log('Bookings seeded successfully');
    console.log('--- SEEDING COMPLETE ---');
    process.exit(0);

  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
};

seedData();

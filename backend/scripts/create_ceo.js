import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Staff from '../models/Staff.js';
import connectDB from '../config/db.js';

const createCEO = async () => {
  try {
    await connectDB();
    const email = 'admin@rentify.lk';
    
    let ceo = await Staff.findOne({ email });
    if (ceo) {
      console.log('CEO account already exists, updating role to superadmin just in case...');
      ceo.role = 'superadmin';
      await ceo.save();
    } else {
      console.log('Creating CEO account...');
      ceo = new Staff({
        name: 'Master CEO',
        email: email,
        password: 'password123',
        role: 'superadmin',
        status: 'active',
        verified: true,
      });
      await ceo.save();
    }
    
    console.log('✅ CEO Account Setup Complete.');
    console.log(`Email: ${email}`);
    console.log(`Password: password123`);
    process.exit(0);
  } catch (error) {
    console.error('Error creating CEO account:', error);
    process.exit(1);
  }
};

createCEO();

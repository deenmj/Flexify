// backend/scripts/seedVehicles.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import VehicleMake from '../models/VehicleMake.js';
import VehicleModel from '../models/VehicleModel.js';

dotenv.config();

const MAKES_MODELS = [
  {
    make: 'Toyota',
    models: ['Aqua', 'Prius', 'Vitz', 'Corolla', 'Premio', 'Allion', 'Axio', 'Hilux', 'Hiace', 'Land Cruiser', 'Prado', 'CH-R', 'Raize']
  },
  {
    make: 'Honda',
    models: ['Fit', 'Vezel', 'Civic', 'Grace', 'Insight', 'CR-V', 'Shuttle', 'Dio', 'Hornet', 'PCX']
  },
  {
    make: 'Suzuki',
    models: ['Alto', 'Wagon R', 'Swift', 'Every', 'Carry', 'Spacia', 'Vitara']
  },
  {
    make: 'Nissan',
    models: ['Leaf', 'Dayz', 'Sunny', 'X-Trail', 'Navara', 'NV200', 'Caravan']
  },
  {
    make: 'Mitsubishi',
    models: ['Montero', 'L200', 'Pajero', 'Outlander', 'Lancer', 'Xpander']
  },
  {
    make: 'Bajaj',
    models: ['Pulsar 150', 'Pulsar 180', 'Discover', 'Platina', 'CT100', 'RE Three Wheeler']
  },
  {
    make: 'Yamaha',
    models: ['FZ', 'FZS', 'RayZR', 'R15', 'MT-15', 'Fascino']
  },
  {
    make: 'TVS',
    models: ['Apache', 'Ntorq', 'Jupiter', 'King Three Wheeler']
  },
  {
    make: 'Hyundai',
    models: ['Tucson', 'Santa Fe', 'Ioniq', 'Elantra']
  },
  {
    make: 'Kia',
    models: ['Sportage', 'Sorento', 'Rio', 'Picanto']
  },
  {
    make: 'Mazda',
    models: ['Axela', 'Demio', 'CX-5']
  },
  {
    make: 'Land Rover',
    models: ['Defender', 'Range Rover', 'Discovery']
  }
];

async function seed() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/flexify';
    console.log('Connecting to:', mongoUri);
    await mongoose.connect(mongoUri);

    console.log('Clearing existing approved makes/models...');
    // We don't delete everything, just the ones we're about to seed to avoid duplicates
    // or we can just use upsert logic. Let's do a clean seed for approved ones.
    
    for (const item of MAKES_MODELS) {
      console.log(`Seeding Make: ${item.make}`);
      
      let makeDoc = await VehicleMake.findOne({ name: item.make });
      if (!makeDoc) {
        makeDoc = await VehicleMake.create({
          name: item.make,
          approved: true
        });
      } else {
        makeDoc.approved = true;
        await makeDoc.save();
      }

      for (const modelName of item.models) {
        let modelDoc = await VehicleModel.findOne({ make: makeDoc._id, name: modelName });
        if (!modelDoc) {
          await VehicleModel.create({
            make: makeDoc._id,
            name: modelName,
            approved: true
          });
        } else {
          modelDoc.approved = true;
          await modelDoc.save();
        }
      }
    }

    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();

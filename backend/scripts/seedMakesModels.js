// backend/scripts/seedMakesModels.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import VehicleMake from "../models/VehicleMake.js";
import VehicleModel from "../models/VehicleModel.js";

dotenv.config({ path: "./.env" });

const seedData = [
  {
    make: "Toyota",
    models: ["Vitz", "Corolla", "Premio", "Axio", "Prius", "Voxy", "Noah", "Hiace/KDH", "CHR", "RAV4", "Yaris"]
  },
  {
    make: "Honda",
    models: ["Vezel", "Grace", "Fit", "City", "Civic", "Insight", "Shuttle", "CR-V", "Jade"]
  },
  {
    make: "Suzuki",
    models: ["Alto", "Wagon R", "Swift", "Spacia", "Hustler", "Every", "Jimny", "Vitara"]
  },
  {
    make: "Nissan",
    models: ["March", "Serena", "X-Trail", "Note", "Leaf", "Dayz", "NV200", "Sunny", "Bluebird"]
  },
  {
    make: "Mitsubishi",
    models: ["Outlander", "Montero", "Lancer", "Pajero", "L200", "Eclipse Cross"]
  },
  {
    make: "Mazda",
    models: ["Axela", "Demio", "CX-5", "CX-3", "Mazda 6"]
  },
  {
    make: "Mercedes-Benz",
    models: ["C-Class", "E-Class", "S-Class", "CLA", "GLA"]
  },
  {
    make: "BMW",
    models: ["3 Series", "5 Series", "X1", "X3", "X5", "i3"]
  },
  {
    make: "Kia",
    models: ["Sportage", "Sorento", "Picanto", "Rio", "Stonic"]
  },
  {
    make: "Hyundai",
    models: ["Tucson", "Santa Fe", "Ioniq", "Kona", "Elantra"]
  },
  {
    make: "Tata",
    models: ["Nano", "Indigo", "Safari", "Aria"]
  },
  {
    make: "Mahindra",
    models: ["Scorpio", "XUV500", "Bolero", "KUV100"]
  },
  {
    make: "Perodua",
    models: ["Bezza", "Axia", "Myvi", "Viva"]
  }
];

const seed = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb+srv://marketvendor_auth_db_user:CVlYjrQ55dvWadH8@flexifyrental.wuhrwxx.mongodb.net/?appName=flexifyRental";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB for seeding...");

    for (const item of seedData) {
      // Find or create make
      let makeObj = await VehicleMake.findOne({ name: item.make });
      if (!makeObj) {
        makeObj = await VehicleMake.create({ name: item.make, approved: true });
        console.log(`Created Make: ${item.make}`);
      } else {
        makeObj.approved = true;
        await makeObj.save();
      }

      for (const modelName of item.models) {
        // Find or create model
        let modelObj = await VehicleModel.findOne({ make: makeObj._id, name: modelName });
        if (!modelObj) {
          await VehicleModel.create({ make: makeObj._id, name: modelName, approved: true });
          console.log(`  Added Model: ${modelName} to ${item.make}`);
        } else {
          modelObj.approved = true;
          await modelObj.save();
        }
      }
    }

    console.log("Seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
};

seed();

import 'dotenv/config';
import connectDB from '../config/db.js';
import Staff from '../models/Staff.js';
import User from '../models/User.js';

const seedTestAccounts = async () => {
  try {
    await connectDB();
    console.log("Connected to DB. Seeding test accounts...");

    const password = "password123";

    // 1. CEO (Must be admin@rentify.lk for the middleware)
    let ceo = await Staff.findOne({ email: "admin@rentify.lk" });
    if (!ceo) {
      ceo = new Staff({ name: "Test CEO", email: "admin@rentify.lk", password, role: "superadmin", verified: true });
      await ceo.save();
      console.log("Created CEO account: admin@rentify.lk");
    } else {
      ceo.role = "superadmin";
      ceo.verified = true;
      ceo.password = password; // this will re-hash
      await ceo.save();
      console.log("Updated CEO account: admin@rentify.lk");
    }

    // 2. Admin
    let admin = await Staff.findOne({ email: "admin@test.com" });
    if (!admin) {
      admin = new Staff({ name: "Test Admin", email: "admin@test.com", password, role: "admin", verified: true });
      await admin.save();
      console.log("Created Admin account: admin@test.com");
    } else {
      admin.role = "admin";
      admin.verified = true;
      admin.password = password;
      await admin.save();
      console.log("Updated Admin account: admin@test.com");
    }

    // 3. Staff
    let staff = await Staff.findOne({ email: "staff@test.com" });
    if (!staff) {
      staff = new Staff({ name: "Test Staff", email: "staff@test.com", password, role: "staff", verified: true });
      await staff.save();
      console.log("Created Staff account: staff@test.com");
    } else {
      staff.role = "staff";
      staff.verified = true;
      staff.password = password;
      await staff.save();
      console.log("Updated Staff account: staff@test.com");
    }

    // 4. Verified Owner
    let owner = await User.findOne({ email: "owner@test.com" });
    if (!owner) {
      owner = new User({ name: "Test Owner", email: "owner@test.com", password, role: "owner", ownerType: "VERIFIED", isKycVerified: true });
      await owner.save();
      console.log("Created Owner account: owner@test.com");
    } else {
      owner.role = "owner";
      owner.ownerType = "VERIFIED";
      owner.isKycVerified = true;
      owner.password = password;
      await owner.save();
      console.log("Updated Owner account: owner@test.com");
    }

    // 5. Standard User
    let user = await User.findOne({ email: "user@test.com" });
    if (!user) {
      user = new User({ name: "Test Customer", email: "user@test.com", password, role: "user", isKycVerified: true });
      await user.save();
      console.log("Created User account: user@test.com");
    } else {
      user.role = "user";
      user.password = password;
      await user.save();
      console.log("Updated User account: user@test.com");
    }

    console.log("\n✅ All 5 test accounts successfully provisioned!");
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed test accounts:", error);
    process.exit(1);
  }
};

seedTestAccounts();

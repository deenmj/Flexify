// backend/scripts/migrate_staff.js
import mongoose from "mongoose";
import "dotenv/config.js";
import User from "../models/User.js";
import Staff from "../models/Staff.js";
import connectDB from "../config/db.js";

async function migrateStaff() {
  try {
    await connectDB();
    console.log("Connected to DB. Starting migration...");

    // Find all users with roles 'superadmin' or 'subadmin'
    // Since we just updated the schema enum, Mongoose might throw validation errors
    // if we try to save/update these docs, so we will use lean() and raw queries.
    const admins = await User.find({
      role: { $in: ["superadmin", "subadmin"] },
    }).lean();

    if (admins.length === 0) {
      console.log("No staff users found in User collection.");
      process.exit(0);
    }

    console.log(`Found ${admins.length} staff records to migrate.`);

    for (const oldUser of admins) {
      // Map role
      let newRole = "staff"; // fallback
      if (oldUser.role === "superadmin") newRole = "admin";
      if (oldUser.role === "subadmin") newRole = "staff";

      // Check if already migrated
      const existingStaff = await Staff.findById(oldUser._id);
      if (existingStaff) {
         console.log(`Skipping ${oldUser.email}, already exists in Staff.`);
         continue;
      }

      // Create new Staff document preserving _id
      const staffDoc = new Staff({
        _id: oldUser._id,
        name: oldUser.name,
        email: oldUser.email,
        phone: oldUser.phone,
        address: oldUser.address,
        password: oldUser.password, // hashed password
        provider: oldUser.provider,
        role: newRole,
        status: oldUser.status,
        verified: oldUser.verified,
        profilePic: oldUser.profilePic,
        notificationEmail: oldUser.notificationEmail,
        isNotificationEmailActive: oldUser.isNotificationEmailActive,
        createdAt: oldUser.createdAt,
        updatedAt: oldUser.updatedAt,
      });

      // Save without triggering validations that might re-hash the password
      // Since it's a new document, pre('save') would trigger if password is modified.
      // But we are setting it directly. Let's use insertMany or collection.insertOne to avoid hooks.
      await Staff.collection.insertOne(staffDoc.toObject({ getters: true, virtuals: false }));

      // Delete from User collection
      await User.collection.deleteOne({ _id: oldUser._id });

      console.log(`Migrated ${oldUser.email} from ${oldUser.role} to ${newRole}`);
    }

    console.log("Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateStaff();

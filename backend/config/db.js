// backend/config/db.js
import mongoose from "mongoose";

const runMigration = async (db) => {
  try {
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    const staffColName = collectionNames.find(n => n === "staffs" || n === "staff");
    if (!staffColName) return; // No migration needed
    
    console.log(`📋 Found Staff collection, starting automatic database schema migration...`);
    
    const usersCol    = db.collection("users");
    const vehiclesCol = db.collection("vehicles");
    const bookingsCol = db.collection("bookings");
    const staffCol    = db.collection(staffColName);

    const staffDocs = await staffCol.find({}).toArray();
    const staffIdToUserId = {};

    const ROLE_MAP = {
      staff:      "subadmin",
      admin:      "subadmin",
      manager:    "subadmin",
      supervisor: "subadmin",
      superadmin: "superadmin",
      owner:      "owner",
      user:       "user",
    };

    for (const staff of staffDocs) {
      const newRole = ROLE_MAP[staff.role] || "subadmin";
      const existingUser = await usersCol.findOne({ email: staff.email.toLowerCase() });

      if (existingUser) {
        const updates = {
          role: newRole,
          phone: staff.phone || existingUser.phone || "",
          address: staff.address || existingUser.address || "",
          isKycVerified: staff.isKycVerified ?? existingUser.isKycVerified,
          verificationStatus: staff.verificationStatus || existingUser.verificationStatus,
          documents: staff.documents || existingUser.documents || {},
          subscription: staff.subscription || existingUser.subscription || null,
          profilePic: staff.profilePic || existingUser.profilePic || "",
          notificationEmail: staff.notificationEmail || existingUser.notificationEmail || "",
        };
        if (staff.ownerType) updates.ownerType = staff.ownerType;
        if (staff.kycVerifiedAt) updates.kycVerifiedAt = staff.kycVerifiedAt;

        await usersCol.updateOne({ _id: existingUser._id }, { $set: updates });
        staffIdToUserId[staff._id.toString()] = existingUser._id;
      } else {
        const newUser = {
          _id: new mongoose.Types.ObjectId(),
          name: staff.name,
          email: staff.email.toLowerCase(),
          password: staff.password || undefined,
          provider: staff.provider || "local",
          role: newRole,
          ownerType: staff.ownerType || null,
          status: staff.status || "active",
          verified: staff.verified ?? true,
          isKycVerified: staff.isKycVerified ?? false,
          verificationStatus: staff.verificationStatus || "not_submitted",
          rejectionReason: staff.rejectionReason || null,
          rejectionComment: staff.rejectionComment || null,
          rejectedAt: staff.rejectedAt || null,
          kycVerifiedAt: staff.kycVerifiedAt || null,
          documents: staff.documents || {},
          subscription: staff.subscription || null,
          phone: staff.phone || "",
          address: staff.address || "",
          profilePic: staff.profilePic || "",
          notificationEmail: staff.notificationEmail || "",
          isNotificationEmailActive: staff.isNotificationEmailActive || false,
          createdAt: staff.createdAt || new Date(),
          updatedAt: staff.updatedAt || new Date(),
        };
        await usersCol.insertOne(newUser);
        staffIdToUserId[staff._id.toString()] = newUser._id;
      }
    }

    const staffVehicles = await vehiclesCol.find({ ownerModel: "Staff" }).toArray();
    for (const v of staffVehicles) {
      const oldStaffId = v.owner.toString();
      const newUserId  = staffIdToUserId[oldStaffId];
      if (newUserId) {
        await vehiclesCol.updateOne(
          { _id: v._id },
          { $set: { owner: newUserId }, $unset: { ownerModel: "" } }
        );
      }
    }

    await vehiclesCol.updateMany(
      { ownerModel: { $exists: true } },
      { $unset: { ownerModel: "" } }
    );

    const allBookings = await bookingsCol.find({}).toArray();
    for (const b of allBookings) {
      const ownerId = b.owner?.toString();
      if (ownerId && staffIdToUserId[ownerId]) {
        await bookingsCol.updateOne({ _id: b._id }, { $set: { owner: staffIdToUserId[ownerId] } });
      }
      const userId = b.user?.toString();
      if (userId && staffIdToUserId[userId]) {
        await bookingsCol.updateOne({ _id: b._id }, { $set: { user: staffIdToUserId[userId] } });
      }
      if (b.ownerModel) {
        await bookingsCol.updateOne({ _id: b._id }, { $unset: { ownerModel: "" } });
      }
    }

    // Drop staff collection after successful migration
    await db.dropCollection(staffColName);
    console.log(`✅ Database schema migration complete. Dropped ${staffColName} collection.`);

  } catch (err) {
    console.error("❌ Migration error:", err);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      family: 4
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Run the schema rollback migration automatically on connection
    await runMigration(conn.connection.db);
    
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;

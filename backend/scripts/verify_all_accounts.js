import 'dotenv/config';
import connectDB from '../config/db.js';
import Staff from '../models/Staff.js';
import User from '../models/User.js';

const verifyAccounts = async () => {
  try {
    await connectDB();
    console.log("Connected to DB. Verifying all accounts...");

    const userResult = await User.updateMany({}, { $set: { verified: true } });
    console.log(`Verified ${userResult.modifiedCount} Users.`);

    const staffResult = await Staff.updateMany({}, { $set: { verified: true } });
    console.log(`Verified ${staffResult.modifiedCount} Staff members.`);

    console.log("✅ All accounts have been manually verified.");
    process.exit(0);
  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  }
};

verifyAccounts();

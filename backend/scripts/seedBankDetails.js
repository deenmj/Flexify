import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../config/db.js";
import BankDetails from "../models/BankDetails.js";

dotenv.config();

const seedBankDetails = async () => {
  try {
    await connectDB();
    console.log("MongoDB Connected...");

    // Check if details already exist
    const current = await BankDetails.findOne();
    if (current) {
      console.log("Bank details already seeded:", current);
      process.exit();
    }

    const defaultDetails = await BankDetails.create({
      bankName: "Commercial Bank",
      accountName: "Flexify Pvt Ltd",
      accountNumber: "8010045622",
      referenceEmail: "luxury@flexify.com",
    });

    console.log("Successfully seeded Bank Details:", defaultDetails);
    process.exit();
  } catch (error) {
    console.error(`Error seeding bank details: ${error.message}`);
    process.exit(1);
  }
};

seedBankDetails();

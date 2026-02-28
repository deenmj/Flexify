// backend/server.js
import dotenv from "dotenv";
dotenv.config(); // ✅ MUST BE FIRST

import express from "express";
import path from "path";
import cors from "cors";
import passport from "passport";

import connectDB from "./config/db.js";
import "./config/passport.js"; // now env vars exist

// Connect DB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

app.use(express.static(path.join(process.cwd(), "..", "..", "flexify-app", "dist")));

// Static uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/userRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import verificationRoutes from "./routes/verificationRoutes.js";
import ownerRoutes from "./routes/ownerRoutes.js";

import { protect } from "./middleware/authMiddleware.js";

app.get("/", (req, res) => {
  res.send("Flexify Backend is Running Successfully!");
});

app.use("/api/auth", authRoutes);
app.use("/api/users", protect, userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", protect, bookingRoutes);
app.use("/api/admin", protect, adminRoutes);
app.use("/api/verify", verificationRoutes);
app.use("/api/owners", ownerRoutes);

// Catch-all to serve React app
app.get("*", (req, res) => {
  res.sendFile(path.join(process.cwd(), "..", "..", "flexify-app", "dist", "index.html"));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

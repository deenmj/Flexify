// backend/server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import passport from "passport";

import connectDB from "./config/db.js";
import "./config/passport.js";

connectDB();

const app = express();

// Security headers
app.use(helmet());

// CORS — restrict to your frontend origin only
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://localhost:5173", // Vite dev server
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.) in dev
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// Global rate limiter — max 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests, please try again later." },
});
app.use(globalLimiter);

app.use(express.json());
app.use(passport.initialize());

app.use(express.static(path.join(process.cwd(), "..", "flexify-app", "dist")));

// Static uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/userRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import subadminRoutes from "./routes/subadminRoutes.js";
import blackoutRoutes from "./routes/blackoutRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import ownerRoutes from "./routes/ownerRoutes.js";

import { protect } from "./middleware/authMiddleware.js";

app.get("/", (req, res) => {
  res.send("Flexify Backend is Running Successfully!");
});

app.use("/api/auth", authRoutes);
app.use("/api/users", protect, userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", protect, bookingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/subadmin", subadminRoutes);
app.use("/api/blackouts", blackoutRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/owner", protect, ownerRoutes);

// Catch-all to serve React app
app.get("*", (req, res) => {
  res.sendFile(path.join(process.cwd(), "..", "flexify-app", "dist", "index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

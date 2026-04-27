// backend/server.js
import "dotenv/config.js";

import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import passport from "passport";

import connectDB from "./config/db.js";

// Early validation of critical environment variables
const criticalEnvs = ["MONGO_URI", "JWT_SECRET"];
criticalEnvs.forEach(env => {
  if (!process.env[env]) {
    console.error(`[FATAL] Missing required environment variable: ${env}`);
    process.exit(1);
  }
});
["FRONTEND_URL", "BACKEND_URL"].forEach(env => {
  if (!process.env[env]) {
    console.warn(`[WARNING] Missing environment variable: ${env}. Using defaults.`);
  }
});

import "./config/passport.js";

import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "./models/User.js";

connectDB();

const app = express();
const httpServer = createServer(app);

// Build the allowed origins list
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : [
      "https://flexify-three.vercel.app",
      "http://localhost:5173",
      "https://flexify-production.up.railway.app",
    ];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Socket.io Auth & Connection Logic
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(" ")[1];
    if (!token) return next(new Error("No token provided"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return next(new Error("User not found"));

    socket.user = user;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  console.log(`📡 Socket Connected: ${socket.user.name} (${socket.id})`);

  // Join private room
  socket.join(socket.user._id.toString());

  // Join admin/subadmin room
  if (socket.user.role === "superadmin" || socket.user.role === "subadmin") {
    socket.join("admin_room");
  }

  socket.on("disconnect", () => {
    console.log(`🔌 Socket Disconnected: ${socket.id}`);
  });
});

// App instance on req for controllers
app.set("io", io);

// Trust proxy (required for Railway/Render — ensures rate limiter uses real client IP)
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));

// Global rate limiter — max 500 requests per 15 minutes per IP
// NOTE: On cloud platforms (Railway/Render), users may share proxy IPs,
// so keep this generous. Auth-specific limiters handle brute-force protection.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { message: "Too many requests, please try again later." },
  // Trust proxy headers from Railway/cloud hosting
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

app.use(express.json());
app.use(passport.initialize());

// Static uploads (No longer serving React frontend as it is on Vercel)// Static uploads
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
import bankDetailsRoutes from "./routes/bankDetailsRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";

import { protect } from "./middleware/authMiddleware.js";

app.get("/", (req, res) => {
  res.send("Rentify Backend is Running Successfully!");
});

app.use("/api/auth", authRoutes);
app.use("/api/users", protect, userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", protect, bookingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/subadmin", subadminRoutes);
app.use("/api/blackouts", blackoutRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/bank-details", bankDetailsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/feedback", feedbackRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: "API Route Not Found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global Error Handler Caught:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server error',
    status: err.status || 500
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT} with Socket.io support`));

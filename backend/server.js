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

import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "./models/User.js";

connectDB();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [process.env.FRONTEND_URL || "http://localhost:3000", "http://localhost:5173"],
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
// Global rate limiter — disabled for now
/*
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests, please try again later." },
});
app.use(globalLimiter);
*/

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
import bankDetailsRoutes from "./routes/bankDetailsRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

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
app.use("/api/owner", ownerRoutes);
app.use("/api/bank-details", bankDetailsRoutes);
app.use("/api/notifications", notificationRoutes);

// Catch-all to serve React app
app.get("*", (req, res) => {
  res.sendFile(path.join(process.cwd(), "..", "flexify-app", "dist", "index.html"));
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

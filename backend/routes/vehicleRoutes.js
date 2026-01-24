import express from "express";
import Vehicle from "../models/Vehicle.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * USER / OWNER: Create a new vehicle listing
 * goes to admin approval queue (approved = false)
 */
// FILE: backend/routes/vehicleRoutes.js
// ----------------------
// Ensure these handlers exist (replace current ones with the below code blocks)

// --- Create new vehicle (user listing) ---
router.post("/", protect, async (req, res) => {
  try {
    const {
      title,
      makeModel,
      year,
      pricePerDay,
      description,
      images,
      location,
      transmission,
      seats,
      serviceType,
      dashboardRequested
    } = req.body;

    if (!title || !makeModel || !pricePerDay) {
      return res.status(400).json({ message: "Title, makeModel and pricePerDay are required" });
    }

    const vehicle = await Vehicle.create({
      owner: req.user._id,
      title,
      makeModel,
      year,
      pricePerDay,
      description,
      images: images || [],
      location: location || { text: "" },
      transmission: transmission || "Auto",
      seats: seats || 4,
      serviceType: serviceType || "Self Drive",
      dashboardRequested: !!dashboardRequested,
      approved: false,    // pending admin approval
      published: false
    });

    // (Optional) Do NOT auto-upgrade to owner here — admin handles verification separately.
    // But if you want listing to also assign owner role, you can set role here.
    // Keep minimal: let admin approve the verification; listing remains pending.

    return res.status(201).json({ message: "Vehicle submitted for admin approval", vehicle });
  } catch (err) {
    console.error("vehicle create error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

// --- Admin approve vehicle ---
router.put("/approve/:id", protect, adminOnly, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    vehicle.approved = true;
    vehicle.published = true;
    await vehicle.save();

    return res.json({ message: "Vehicle approved and published", vehicle });
  } catch (err) {
    console.error("vehicle approve error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

// --- Admin reject vehicle ---
router.put("/reject/:id", protect, adminOnly, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    vehicle.approved = false;
    vehicle.published = false;
    await vehicle.save();

    return res.json({ message: "Vehicle rejected", vehicle });
  } catch (err) {
    console.error("vehicle reject error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
});


/**
 * PUBLIC: Get all approved + published vehicles (Explore/Home)
 * Includes optional filters: ?q=&minPrice=&maxPrice=&type=&transmission=&seats=&sort=
 */
router.get("/", async (req, res) => {
  try {
    const q = req.query.q ? { makeModel: new RegExp(req.query.q, "i") } : {};
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
    const serviceType = req.query.serviceType;
    const transmission = req.query.transmission;
    const seats = req.query.seats ? parseInt(req.query.seats) : null;

    let filter = {
      approved: true,
      published: true,
      pricePerDay: { $gte: minPrice, $lte: maxPrice },
      ...q
    };

    if (serviceType) filter.serviceType = serviceType;
    if (transmission) filter.transmission = transmission;
    if (seats) filter.seats = seats;

    // sorting
    let sort = { createdAt: -1 };
    if (req.query.sort === "price_low") sort = { pricePerDay: 1 };
    if (req.query.sort === "price_high") sort = { pricePerDay: -1 };
    if (req.query.sort === "popular") sort = { timesRented: -1 };

    const vehicles = await Vehicle.find(filter)
      .sort(sort)
      .populate("owner", "name email verified");

    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * OWNER: Get my vehicles (Dashboard)
 */
router.get("/my", protect, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user._id });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * OWNER: Update vehicle details
 */
router.put("/:id", protect, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    if (vehicle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updates = req.body;
    Object.assign(vehicle, updates);

    // reapproval needed
    vehicle.approved = false;
    vehicle.published = false;

    await vehicle.save();
    res.json({ message: "Vehicle updated, pending admin review", vehicle });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * OWNER: Publish / Unpublish vehicle
 */
router.put("/:id/publish", protect, async (req, res) => {
  try {
    const { published } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    if (vehicle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    vehicle.published = !!published;
    await vehicle.save();

    res.json({
      message: published ? "Vehicle published" : "Vehicle unpublished",
      vehicle
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


export default router;

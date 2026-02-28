import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../utils/upload.js";
import Vehicle from "../models/Vehicle.js";

const router = express.Router();

/**
 * PUBLIC: List vehicles (explore)
 * Check max subscription, active, approved
 */
router.get("/", async (req, res) => {
  try {
    const { q, transmission, minPrice, maxPrice, seats, vehicleType, lat, lng, radius, sort } = req.query;

    let filter = {
      approved: true, // Assuming admin approval needed
      isActive: true,
      subscribedUntil: { $gte: new Date() }, // Subscription must be active
    };

    if (q) {
      filter.$or = [
        { make: new RegExp(q, "i") },
        { model: new RegExp(q, "i") },
        { title: new RegExp(q, "i") }
      ];
    }

    if (transmission) filter.transmission = transmission;
    if (seats) filter.seats = { $gte: parseInt(seats) };
    if (minPrice || maxPrice) {
      filter.pricePerDay = {};
      if (minPrice) filter.pricePerDay.$gte = parseFloat(minPrice);
      if (maxPrice) filter.pricePerDay.$lte = parseFloat(maxPrice);
    }

    // Search for Vehicle Type in title/make/description
    if (vehicleType) {
      const typeRegex = new RegExp(vehicleType, "i");
      const typeCondition = { 
        $or: [
          { title: typeRegex },
          { description: typeRegex },
          { make: typeRegex },
          { model: typeRegex },
          { serviceType: typeRegex }
        ] 
      };
      
      if (filter.$or) {
        filter.$and = [ { $or: filter.$or }, typeCondition ];
        delete filter.$or;
      } else {
        filter.$or = typeCondition.$or;
      }
    }

    // Geolocation filter
    if (lat && lng && radius) {
      const radiusInMeters = parseFloat(radius) * 1000;
      filter.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radiusInMeters
        }
      };
    }

    // Sort order
    let sortCondition = { createdAt: -1 };
    if (sort === 'price_low') sortCondition = { pricePerDay: 1 };
    else if (sort === 'price_high') sortCondition = { pricePerDay: -1 };
    else if (sort === 'popular' || sort === 'rating') sortCondition = { timesRented: -1 };

    const vehicles = await Vehicle.find(filter)
      .sort(sortCondition)
      .populate("owner", "name email verified profilePic");

    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * OWNER: Get my vehicles
 */
router.get("/my", protect, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * PUBLIC: Get single vehicle
 */
router.get("/:id", async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate("owner", "name email profilePic verified");
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * OWNER: Create new vehicle
 */
router.post("/", protect, upload.array("photos", 10), async (req, res) => {
  try {
    const {
      title, make, model, year, pricePerDay, transmission, fuelType,
      seats, description, lat, lng, address
    } = req.body;

    // Default to giving them 1 month free subscription trial
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

    const photos = [];
    if (req.files) {
      req.files.forEach(f => photos.push(`/uploads/vehicles/${f.filename}`));
    }

    const vehicle = await Vehicle.create({
      owner: req.user._id,
      title,
      make,
      model,
      year: parseInt(year),
      photos,
      location: {
        type: "Point",
        coordinates: [parseFloat(lng) || 0, parseFloat(lat) || 0],
        address: address || ""
      },
      pricePerDay: parseFloat(pricePerDay),
      transmission,
      fuelType,
      seats: parseInt(seats),
      description,
      isActive: true,
      approved: false, // Default to requiring admin approval
      subscribedUntil: subscriptionEndDate
    });

    res.status(201).json(vehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * OWNER: Update vehicle (details & replace photos)
 */
router.put("/:id", protect, upload.array("photos", 10), async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    if (vehicle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const {
      title, make, model, year, pricePerDay, transmission, fuelType,
      seats, description, lat, lng, address
    } = req.body;

    const updates = { title, make, model, year, pricePerDay, transmission, fuelType, seats, description };
    
    if (lat && lng) {
      updates.location = {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
        address: address || vehicle.location.address
      };
    }

    // append/replace photos
    if (req.files && req.files.length > 0) {
      // For simplicity, replacing existing photos or you can prepend to existing:
      // updates.photos = vehicle.photos.concat(req.files.map(f => `/uploads/vehicles/${f.filename}`));
      updates.photos = req.files.map(f => `/uploads/vehicles/${f.filename}`);
    }

    Object.assign(vehicle, updates);
    await vehicle.save();
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * OWNER: Delete vehicle
 */
router.delete("/:id", protect, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    if (vehicle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await vehicle.deleteOne();
    res.json({ message: "Vehicle deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * OWNER: Toggle availability (isActive)
 */
router.patch("/:id/status", protect, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    if (vehicle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    vehicle.isActive = !vehicle.isActive;
    await vehicle.save();
    
    res.json({ message: `Vehicle is now ${vehicle.isActive ? 'active' : 'inactive'}`, vehicle });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

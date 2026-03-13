// backend/controllers/vehicleController.js
import Vehicle from "../models/Vehicle.js";
import Booking from "../models/Booking.js";
import Blackout from "../models/Blackout.js";
import User from "../models/User.js";
import VehicleMake from "../models/VehicleMake.js";
import VehicleModel from "../models/VehicleModel.js";
import { sendSubadminAlert } from "../utils/notifier.js";

/**
 * Owner creates a vehicle listing.
 * - Verified owner: status = "active" (no approval needed)
 * - Unverified owner: status = "pending" (needs subadmin approval)
 */
export const createVehicle = async (req, res) => {
  try {
    const owner = req.user;
    const {
      title, make, model, year, pricePerDay, transmission, fuelType,
      seats, description, lat, lng, address, serviceType,
    } = req.body;

    if (!title || !make || !model || !pricePerDay) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const photos = [];
    if (req.files) {
      req.files.forEach((f) => photos.push(`/uploads/vehicles/${f.filename}`));
    }

    // Determine status based on owner verification
    let vehicleStatus = "pending";
    if (
      (owner.role === "owner" && owner.ownerType === "VERIFIED") ||
      owner.role === "subadmin" ||
      owner.role === "superadmin"
    ) {
      vehicleStatus = "active";
    }

    // Normalization & Dynamic Creation
    let makeId = make;
    let modelId = model;

    // Helper to find or create approved/pending make/model
    const getNormalizedMake = async (name) => {
      const normalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      let m = await VehicleMake.findOne({ name: new RegExp(`^${name}$`, "i") });
      if (!m) {
        m = await VehicleMake.create({ name: normalized, approved: false, createdBy: owner._id });
      }
      return m;
    };

    const getNormalizedModel = async (makeObjId, name) => {
      const normalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      let m = await VehicleModel.findOne({ make: makeObjId, name: new RegExp(`^${name}$`, "i") });
      if (!m) {
        m = await VehicleModel.create({ make: makeObjId, name: normalized, approved: false, createdBy: owner._id });
      }
      return m;
    };

    // If text values were passed directly (new/other), normalize them
    // Note: If make/model are IDs, we use them, but if they are strings, we create/find
    const mongoose = (await import("mongoose")).default;
    const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

    let finalMakeName = make;
    let finalModelName = model;

    if (!isObjectId(make)) {
      const makeObj = await getNormalizedMake(make);
      finalMakeName = makeObj.name;
    } else {
      const m = await VehicleMake.findById(make);
      if (m) finalMakeName = m.name;
    }

    if (!isObjectId(model)) {
      if (isObjectId(make)) {
        const modelObj = await getNormalizedModel(make, model);
        finalModelName = modelObj.name;
      } else {
        // If make is also new, we'll wait for subadmin to link them or just use strings for vehicle
        // But for consistency let's link to the newly created make
        const makeObj = await getNormalizedMake(make);
        const modelObj = await getNormalizedModel(makeObj._id, model);
        finalModelName = modelObj.name;
      }
    } else {
      const m = await VehicleModel.findById(model);
      if (m) finalModelName = m.name;
    }

    const vehicle = await Vehicle.create({
      owner: owner._id,
      title,
      make: finalMakeName,
      model: finalModelName,
      year: parseInt(year),
      photos,
      location: {
        type: "Point",
        coordinates: [parseFloat(lng) || 0, parseFloat(lat) || 0],
        address: address || "",
      },
      pricePerDay: parseFloat(pricePerDay),
      transmission,
      fuelType,
      seats: parseInt(seats),
      description,
      serviceType: serviceType ? (Array.isArray(serviceType) ? serviceType : [serviceType]) : [],
      status: vehicleStatus,
      isActive: true,
    });

    res.status(201).json(vehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Owner updates their vehicle
 */
export const updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    // Only owner, subadmin, or superadmin can edit
    const isOwner = vehicle.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "subadmin" || req.user.role === "superadmin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { title, make, model, year, pricePerDay, transmission, fuelType, seats, description, lat, lng, address } = req.body;
    const updates = { title, make, model, year, pricePerDay, transmission, fuelType, seats, description };

    if (lat && lng) {
      updates.location = {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
        address: address || vehicle.location?.address || "",
      };
    }

    if (req.files && req.files.length > 0) {
      updates.photos = req.files.map((f) => `/uploads/vehicles/${f.filename}`);
    }

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) vehicle[key] = updates[key];
    });

    await vehicle.save();
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Delete vehicle (owner or admin)
 */
export const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    const isOwner = vehicle.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "subadmin" || req.user.role === "superadmin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await vehicle.deleteOne();
    res.json({ message: "Vehicle deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Public: list active vehicles
 */
export const listVehicles = async (req, res) => {
  try {
    const { q, transmission, minPrice, maxPrice, seats, vehicleType, lat, lng, radius, sort } = req.query;

    let filter = {
      status: "active",
      isActive: true,
    };

    if (q) {
      filter.$or = [
        { make: new RegExp(q, "i") },
        { model: new RegExp(q, "i") },
        { title: new RegExp(q, "i") },
        { "location.address": new RegExp(q, "i") },
      ];
    }

    if (transmission) filter.transmission = transmission;
    if (seats) filter.seats = { $gte: parseInt(seats) };
    if (minPrice || maxPrice) {
      filter.pricePerDay = {};
      if (minPrice) filter.pricePerDay.$gte = parseFloat(minPrice);
      if (maxPrice) filter.pricePerDay.$lte = parseFloat(maxPrice);
    }

    if (vehicleType) {
      filter.serviceType = vehicleType;
    }

    // Geolocation filter
    if (lat && lng && radius) {
      const radiusInMeters = parseFloat(radius) * 1000;
      filter.location = {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: radiusInMeters,
        },
      };
    }

    let sortCondition = { createdAt: -1 };
    if (sort === "price_low") sortCondition = { pricePerDay: 1 };
    else if (sort === "price_high") sortCondition = { pricePerDay: -1 };
    else if (sort === "popular" || sort === "rating") sortCondition = { timesRented: -1 };

    const vehicles = await Vehicle.find(filter)
      .sort(sortCondition)
      .populate("owner", "name email profilePic ownerType");

    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Public: get single vehicle
 */
export const getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate("owner", "name email profilePic ownerType");
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Owner: get my vehicles
 */
export const getMyVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Owner: toggle vehicle active/inactive
 */
export const toggleVehicleStatus = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    if (vehicle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    vehicle.isActive = !vehicle.isActive;
    await vehicle.save();
    res.json({ message: `Vehicle is now ${vehicle.isActive ? "active" : "inactive"}`, vehicle });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Public: get booked date ranges for a vehicle (calendar availability)
 * Returns CONFIRMED + PENDING bookings (future only), no user data exposed.
 */
export const getVehicleAvailability = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const bookings = await Booking.find({
      vehicle: req.params.id,
      status: { $in: ["CONFIRMED", "PENDING"] },
      endDate: { $gte: now }, // only future/current bookings
    })
      .select("startDate endDate status")
      .sort({ startDate: 1 })
      .lean();

    const blackouts = await Blackout.find({
      vehicle: req.params.id,
      endDate: { $gte: now },
    })
      .select("startDate endDate")
      .sort({ startDate: 1 })
      .lean();

    const bookedRanges = bookings.map((b) => ({
      start: b.startDate,
      end: b.endDate,
      status: b.status,
    }));

    const blackoutRanges = blackouts.map((b) => ({
      start: b.startDate,
      end: b.endDate,
    }));

    res.json({ bookedRanges, blackoutRanges });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/**
 * GET all approved makes
 */
export const getMakes = async (req, res) => {
  try {
    const makes = await VehicleMake.find({ approved: true }).sort({ name: 1 });
    res.json(makes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET all approved models for a make
 */
export const getModels = async (req, res) => {
  try {
    const models = await VehicleModel.find({
      make: req.params.makeId,
      approved: true
    }).sort({ name: 1 });
    res.json(models);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

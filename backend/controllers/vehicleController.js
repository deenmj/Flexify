// backend/controllers/vehicleController.js
import Vehicle from "../models/Vehicle.js";
import User from "../models/User.js";

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

    const vehicle = await Vehicle.create({
      owner: owner._id,
      title,
      make,
      model,
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
      const typeRegex = new RegExp(vehicleType, "i");
      const typeCondition = {
        $or: [
          { title: typeRegex },
          { description: typeRegex },
          { make: typeRegex },
          { model: typeRegex },
          { serviceType: typeRegex },
        ],
      };

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, typeCondition];
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

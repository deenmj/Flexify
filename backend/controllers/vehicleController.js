// backend/controllers/vehicleController.js
import Vehicle from "../models/Vehicle.js";
import User from "../models/User.js";

// Owner creates a listing (normal or request dashboard)
export const createVehicle = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const {
      title, makeModel, year, pricePerDay,
      location, serviceType, transmission, seats, description, images, dashboardRequested
    } = req.body;

    if (!title || !makeModel || !pricePerDay || !location) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const vehicle = await Vehicle.create({
      owner: ownerId,
      title,
      makeModel,
      year,
      pricePerDay,
      location,
      serviceType,
      transmission,
      seats,
      description,
      images: images || [],
      dashboardRequested: !!dashboardRequested,
      approved: false,
      published: false
    });

    // notify admin - placeholder (implement notifications later)
    return res.status(201).json(vehicle);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Owner edits vehicle (only owner)
export const updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    if (vehicle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updatable = ["title","makeModel","year","pricePerDay","location","serviceType","transmission","seats","description","images"];
    updatable.forEach(field => {
      if (req.body[field] !== undefined) vehicle[field] = req.body[field];
    });

    // when owner edits details, set approved=false so admin can re-approve (optional business rule)
    vehicle.approved = vehicle.approved && false;

    await vehicle.save();
    return res.json(vehicle);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Admin approves vehicle
export const approveVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate("owner", "name email verified");
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    vehicle.approved = true;
    vehicle.published = true; // publish on approval by default
    await vehicle.save();

    // if owner requested dashboard, signal that admin should create dashboard / invoice - leave to adminController
    return res.json(vehicle);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Admin unapprove / reject
export const rejectVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    vehicle.approved = false;
    vehicle.published = false;
    await vehicle.save();
    return res.json({ message: "Vehicle rejected" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Public list - only approved & published vehicles
export const listVehicles = async (req, res) => {
  try {
    // Support basic query params: q, minPrice, maxPrice, type, transmission, seats, sort
    const q = req.query.q ? { $text: { $search: req.query.q } } : {};
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
    const type = req.query.type;
    const transmission = req.query.transmission;
    const seats = req.query.seats ? parseInt(req.query.seats) : null;

    let filter = { approved: true, published: true, pricePerDay: { $gte: minPrice, $lte: maxPrice }, ...q };

    if (type) filter.serviceType = type;
    if (transmission) filter.transmission = transmission;
    if (seats) filter.seats = seats;

    // sorting
    let sort = { createdAt: -1 };
    if (req.query.sort === "price_asc") sort = { pricePerDay: 1 };
    if (req.query.sort === "price_desc") sort = { pricePerDay: -1 };
    if (req.query.sort === "pop") sort = { timesRented: -1 };

    const vehicles = await Vehicle.find(filter).sort(sort).populate("owner", "name verified");
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Owner: get my vehicles (for dashboard)
export const getMyVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user._id });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Publish/Unpublish by owner
export const setPublish = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    if (vehicle.owner.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not authorized" });

    vehicle.published = !!req.body.published;
    await vehicle.save();
    return res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

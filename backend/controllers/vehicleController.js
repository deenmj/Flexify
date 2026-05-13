// backend/controllers/vehicleController.js
import mongoose from "mongoose";
import Vehicle from "../models/Vehicle.js";
import Booking from "../models/booking.js";
import Blackout from "../models/Blackout.js";
import User from "../models/User.js";
import VehicleMake from "../models/VehicleMake.js";
import VehicleModel from "../models/VehicleModel.js";
import { sendSubadminAlert } from "../utils/notifier.js";
import cloudinary from "../utils/cloudinary.js";

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
      engineCapacity, fuelConsumption, features, province, district, city,
      pricePerWeek, pricePerMonth, kmLimitPerDay, extraKmPrice,
      driverOption, driverPricePerDay
    } = req.body;

    // Subscription Check & Initialization — only for owners (staff/admins get free unlimited access)
    if (owner.role === "owner") {
      // If no subscription found, initialize with FREE tier (permanent, no expiry)
      if (!owner.subscription || !owner.subscription.status) {
        await User.findByIdAndUpdate(owner._id, {
          subscription: {
            tier: 'FREE',
            status: 'free',
            startDate: new Date(),
            endDate: null
          }
        });
        
        // Update local owner object for subsequent checks
        owner.subscription = {
          tier: 'FREE',
          status: 'free',
          startDate: new Date(),
          endDate: null
        };
      }

      const sub = owner.subscription;
      const now = new Date();
      
      // Check if paid subscription is expired (FREE tier never expires)
      if (sub.tier !== 'FREE' && sub.status !== 'free') {
        const isExpired = sub.status === 'expired' || (sub.endDate && now > new Date(sub.endDate));
        if (isExpired) {
          const inGrace = sub.gracePeriodEnd && now <= new Date(sub.gracePeriodEnd);
          if (!inGrace) {
            return res.status(403).json({ 
              message: "Your subscription has expired. Please renew or you'll be downgraded to the Free plan (2 vehicles).",
              subscriptionExpired: true
            });
          }
        }
      }

      // Vehicle limits per tier: FREE=2, STANDARD=8, PRO=unlimited
      const vehicleCount = await Vehicle.countDocuments({ owner: owner._id });
      if (sub.tier === 'FREE' && vehicleCount >= 2) {
        return res.status(403).json({ message: "Free plan limit reached (2 vehicles). Upgrade to Standard for up to 8 listings." });
      } else if (sub.tier === 'STANDARD' && vehicleCount >= 8) {
        return res.status(403).json({ message: "Standard plan limit reached (8 vehicles). Upgrade to Pro for unlimited listings." });
      }
    }
    // Subadmins and superadmins skip all subscription checks — free unlimited access

    if (!title || !make || !model || !pricePerDay) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const photos = [];
    if (req.files) {
      req.files.forEach((f) => photos.push({
        url: f.path, // multer-storage-cloudinary provides the secure_url in f.path
        public_id: f.filename
      }));
    }

    // All owner listings are set to 'active' immediately as per user request
    // Listing verification is moved to the booking approval stage
    let vehicleStatus = "active";

    // Normalization & Dynamic Creation
    const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

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

    let finalMakeName = make;
    let finalModelName = model;

    // Resolve make first (needed for model lookup)
    let resolvedMakeObj = null;
    if (!isObjectId(make)) {
      resolvedMakeObj = await getNormalizedMake(make);
      finalMakeName = resolvedMakeObj.name;
    } else {
      const m = await VehicleMake.findById(make);
      if (m) {
        finalMakeName = m.name;
        resolvedMakeObj = m;
      }
    }

    // Resolve model (uses resolved make)
    if (!isObjectId(model)) {
      if (resolvedMakeObj) {
        const modelObj = await getNormalizedModel(resolvedMakeObj._id, model);
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
      pricePerWeek: pricePerWeek ? parseFloat(pricePerWeek) : null,
      pricePerMonth: pricePerMonth ? parseFloat(pricePerMonth) : null,
      kmLimitPerDay: kmLimitPerDay ? parseInt(kmLimitPerDay) : null,
      extraKmPrice: extraKmPrice ? parseFloat(extraKmPrice) : null,
      transmission,
      fuelType,
      seats: parseInt(seats),
      description,
      serviceType: serviceType ? (Array.isArray(serviceType) ? serviceType : [serviceType]) : [],
      status: vehicleStatus,
      isActive: true,
      
      // New fields
      engineCapacity,
      fuelConsumption,
      features: features ? (typeof features === 'string' ? JSON.parse(features) : features) : [],
      province,
      district,
      city,
      driverOption: driverOption || "self-drive",
      driverPricePerDay: driverPricePerDay ? parseFloat(driverPricePerDay) : 0,
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

    const { 
      title, make, model, year, pricePerDay, transmission, fuelType, seats, description, 
      lat, lng, address, engineCapacity, fuelConsumption, features, province, district, city,
      pricePerWeek, pricePerMonth, kmLimitPerDay, extraKmPrice,
      driverOption, driverPricePerDay
    } = req.body;
    
    const updates = { 
      title, make, model, year, pricePerDay, transmission, fuelType, seats, description,
      engineCapacity, fuelConsumption, province, district, city,
      pricePerWeek, pricePerMonth,
      kmLimitPerDay: kmLimitPerDay ? parseInt(kmLimitPerDay) : null,
      extraKmPrice: extraKmPrice ? parseFloat(extraKmPrice) : null,
      driverOption,
      driverPricePerDay: driverPricePerDay ? parseFloat(driverPricePerDay) : 0
    };

    if (features) {
      updates.features = typeof features === 'string' ? JSON.parse(features) : features;
    }

    if (lat && lng) {
      updates.location = {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
        address: address || vehicle.location?.address || "",
      };
    }

    let finalPhotos = [];
    if (req.body.existingPhotos) {
      try {
        finalPhotos = JSON.parse(req.body.existingPhotos);
      } catch (e) {
        // Fallback if it's already an array or parsed differently
        finalPhotos = Array.isArray(req.body.existingPhotos) ? req.body.existingPhotos : [];
      }
    } else if (req.body.existingPhotos === "[]") {
      finalPhotos = [];
    } else if (vehicle.photos && req.body.existingPhotos === undefined && (!req.files || req.files.length === 0)) {
        // If frontend didn't send existingPhotos and no new files, keep current
        finalPhotos = vehicle.photos;
    }

    if (req.files && req.files.length > 0) {
      const newPhotos = req.files.map((f) => ({
        url: f.path,
        public_id: f.filename
      }));
      finalPhotos = [...finalPhotos, ...newPhotos];
    }
    
    // Identify deleted photos to remove them from Cloudinary
    if (req.body.existingPhotos !== undefined) {
      const existingPublicIds = finalPhotos.map(p => p.public_id);
      const deletedPhotos = (vehicle.photos || []).filter(op => op.public_id && !existingPublicIds.includes(op.public_id));
      
      for (const dp of deletedPhotos) {
        try {
          await cloudinary.uploader.destroy(dp.public_id);
        } catch (cloudinaryErr) {
          console.error("Failed to delete photo from Cloudinary:", cloudinaryErr);
        }
      }
    }
    
    // Only update the database if existingPhotos was provided or new files were uploaded
    if (req.body.existingPhotos !== undefined || (req.files && req.files.length > 0)) {
       updates.photos = finalPhotos;
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

    // Cancel all pending or confirmed bookings associated with this vehicle
    await Booking.updateMany(
      { vehicle: vehicle._id, status: { $in: ["PENDING", "CONFIRMED"] } },
      { $set: { status: "CANCELLED", cancellationReason: "Vehicle removed by the owner." } }
    );

    await vehicle.deleteOne();
    res.json({ message: "Vehicle deleted successfully, and associated active bookings were canceled." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Public: list active vehicles
 */
export const listVehicles = async (req, res) => {
  try {
    const { 
      q, transmission, minPrice, maxPrice, seats, vehicleType, 
      lat, lng, radius, sort, province, district, 
      startDate, endDate, driverOption,
      page = 1, limit = 12 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    let filter = {
      status: "active",
      isActive: true,
    };

    if (q) {
      filter.$text = { $search: q };
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

    if (province) filter.province = province;
    if (district) filter.district = district;

    if (driverOption) {
      if (driverOption === 'with-driver') {
        filter.driverOption = { $in: ['with-driver', 'both'] };
      } else if (driverOption === 'self-drive') {
        filter.driverOption = { $in: ['self-drive', 'both'] };
      }
    }

    // Date Availability Filtering
    if (startDate && endDate) {
      const sDate = new Date(startDate);
      const eDate = new Date(endDate);

      // Find vehicles that ARE booked or blacked out during these dates
      const [bookedVehicleIds, blackoutVehicleIds] = await Promise.all([
        Booking.find({
          status: "CONFIRMED",
          $or: [{ startDate: { $lte: eDate }, endDate: { $gte: sDate } }]
        }).distinct("vehicle"),
        Blackout.find({
          $or: [{ startDate: { $lte: eDate }, endDate: { $gte: sDate } }]
        }).distinct("vehicle")
      ]);

      // Combine and EXCLUDE these IDs from the main filter
      const unavailableIds = [...new Set([...bookedVehicleIds, ...blackoutVehicleIds])];
      if (unavailableIds.length > 0) {
        filter._id = { $nin: unavailableIds };
      }
    }

    let sortCondition = { createdAt: -1 };
    if (sort === "price_low") sortCondition = { pricePerDay: 1 };
    else if (sort === "price_high") sortCondition = { pricePerDay: -1 };
    else if (sort === "popular" || sort === "rating") sortCondition = { timesRented: -1 };

    // Build aggregation pipeline
    // NOTE: $near is NOT supported in aggregation $match stages.
    // Must use $geoNear as the FIRST pipeline stage for geospatial queries.
    const pipeline = [];
    const useGeo = lat && lng && radius;

    if (useGeo) {
      const radiusInMeters = parseFloat(radius) * 1000;
      pipeline.push({
        $geoNear: {
          near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: "distance",
          maxDistance: radiusInMeters,
          spherical: true,
          query: filter, // other filters applied here alongside geo
        }
      });
    } else {
      pipeline.push({ $match: filter });
    }

    // Use aggregation to filter by owner subscription status and apply tier boost
    const now = new Date();
    const vehicles = await Vehicle.aggregate([
      ...pipeline,
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "ownerInfo"
        }
      },
      { $unwind: "$ownerInfo" },
      {
        $match: {
          $or: [
            { "ownerInfo.subscription": null },
            { "ownerInfo.subscription": { $exists: false } }, // Handle missing field
            { "ownerInfo.subscription.status": "active" },
            { "ownerInfo.subscription.status": "free" },
            { 
              "ownerInfo.subscription.status": "expired",
              "ownerInfo.subscription.gracePeriodEnd": { $gte: now }
            },
            {
              "ownerInfo.subscription.status": "expired",
              "ownerInfo.subscription.gracePeriodEnd": { $exists: false } // Fallback if grace missing
            }
          ]
        }
      },
      {
        $addFields: {
          tierBoost: {
            $switch: {
              branches: [
                { case: { $eq: ["$ownerInfo.subscription.tier", "PRO"] }, then: 100 },
                { case: { $eq: ["$ownerInfo.subscription.tier", "STANDARD"] }, then: 50 },
                { case: { $eq: ["$ownerInfo.subscription.tier", "FREE"] }, then: 5 },
                { case: { $eq: ["$ownerInfo.subscription.status", "free"] }, then: 5 }
              ],
              default: 0
            }
          }
        }
      },
      { $sort: { tierBoost: -1, ...sortCondition } },
      { $skip: skip },
      { $limit: limitNum },
      {
        $project: {
          _id: 1,
          owner: {
            _id: "$ownerInfo._id",
            name: "$ownerInfo.name",
            email: "$ownerInfo.email",
            profilePic: "$ownerInfo.profilePic",
            ownerType: "$ownerInfo.ownerType",
            subscription: "$ownerInfo.subscription"
          },
          title: 1,
          make: 1,
          model: 1,
          year: 1,
          photos: 1,
          location: 1,
          pricePerDay: 1,
          pricePerWeek: 1,
          pricePerMonth: 1,
          transmission: 1,
          fuelType: 1,
          seats: 1,
          description: 1,
          serviceType: 1,
          status: 1,
          isActive: 1,
          timesRented: 1,
          averageRating: 1,
          reviewCount: 1,
          engineCapacity: 1,
          fuelConsumption: 1,
          features: 1,
          province: 1,
          district: 1,
          city: 1,
          kmLimitPerDay: 1,
          extraKmPrice: 1,
          driverOption: 1,
          driverPricePerDay: 1,
          createdAt: 1
        }
      }
    ]);

    // Also return total count for pagination metadata
    const totalCount = await Vehicle.countDocuments(filter);

    res.json({
      vehicles,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
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

/**
 * Public: Get platform-wide statistics for Home/About pages
 */
export const getPublicStats = async (req, res) => {
  try {
    const totalActiveVehicles = await Vehicle.countDocuments({ status: "active", isActive: true });
    const totalVerifiedOwners = await User.countDocuments({ role: "owner", ownerType: "VERIFIED" });
    const totalVerifiedUsers = await User.countDocuments({ isKycVerified: true });
    
    // Distinct districts/locations
    const result = await Vehicle.aggregate([
      { $match: { status: "active", isActive: true } },
      { $group: { _id: "$location.address" } }
    ]);
    const totalDistricts = result.length > 0 ? result.length : 0;

    // Average rating
    const ratingResult = await Vehicle.aggregate([
      { $match: { status: "active", isActive: true, averageRating: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: "$averageRating" } } }
    ]);
    const averageRating = ratingResult.length > 0 ? parseFloat(ratingResult[0].avg.toFixed(1)) : 0;

    res.json({
      totalActiveVehicles,
      totalVerifiedOwners,
      totalVerifiedUsers,
      totalDistricts,
      averageRating
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// backend/controllers/saleListingController.js
import VehicleSaleListing from "../models/VehicleSaleListing.js";
import cloudinary from "../utils/cloudinary.js";

/**
 * Create a new vehicle sale listing.
 * Images are optional — form can submit without any photos.
 */
export const createSaleListing = async (req, res) => {
  try {
    const seller = req.user;
    const {
      title, price, condition, mileage, city,
      contactPhone, description, fuelType, transmission, engineCapacity,
    } = req.body;

    // Validate mandatory fields
    if (!title || !price || !condition || !mileage || !city || !contactPhone) {
      return res.status(400).json({ message: "Missing required fields: title, price, condition, mileage, city, and contactPhone are mandatory." });
    }

    // Process optional photos
    const photos = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((f) => photos.push({
        url: f.path,
        public_id: f.filename,
      }));
    }

    const listing = await VehicleSaleListing.create({
      seller: seller._id,
      listingType: "SALE",
      title,
      price: parseFloat(price),
      condition,
      mileage: parseInt(mileage),
      city,
      contactPhone,
      description: description || "",
      fuelType: fuelType || null,
      transmission: transmission || null,
      engineCapacity: engineCapacity || null,
      photos,
      status: "Pending",
    });

    res.status(201).json(listing);
  } catch (err) {
    console.error("Create sale listing error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Public: Get all approved sale listings with filters, search, pagination.
 */
export const getApprovedSaleListings = async (req, res) => {
  try {
    const {
      q, condition, city, minPrice, maxPrice, sort,
      page = 1, limit = 20,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const filter = { status: "Approved" };

    if (q) {
      filter.$text = { $search: q };
    }
    if (condition) filter.condition = condition;
    if (city) filter.city = city;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    let sortCondition = { createdAt: -1 };
    if (sort === "price_low") sortCondition = { price: 1 };
    else if (sort === "price_high") sortCondition = { price: -1 };
    else if (sort === "newest") sortCondition = { createdAt: -1 };
    else if (sort === "oldest") sortCondition = { createdAt: 1 };

    const [listings, total] = await Promise.all([
      VehicleSaleListing.find(filter)
        .populate("seller", "name email profilePic phone")
        .sort(sortCondition)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      VehicleSaleListing.countDocuments(filter),
    ]);

    res.json({
      listings,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("Get sale listings error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Public: Get a single sale listing by ID.
 */
export const getSaleListingById = async (req, res) => {
  try {
    const listing = await VehicleSaleListing.findById(req.params.id)
      .populate("seller", "name email profilePic phone");
    if (!listing) return res.status(404).json({ message: "Sale listing not found" });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Authenticated: Get current user's sale listings.
 */
export const getMySaleListings = async (req, res) => {
  try {
    const listings = await VehicleSaleListing.find({ seller: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Authenticated (owner only): Mark a listing as sold.
 */
export const markAsSold = async (req, res) => {
  try {
    const listing = await VehicleSaleListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    if (listing.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    listing.status = "Sold";
    listing.soldAt = new Date();
    await listing.save();

    res.json({ message: "Listing marked as sold", listing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Authenticated (owner or admin): Delete a sale listing.
 */
export const deleteSaleListing = async (req, res) => {
  try {
    const listing = await VehicleSaleListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    const isOwner = listing.seller.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "subadmin" || req.user.role === "superadmin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Clean up Cloudinary photos
    for (const photo of listing.photos || []) {
      try {
        if (photo.public_id) await cloudinary.uploader.destroy(photo.public_id);
      } catch (cloudErr) {
        console.error("Cloudinary cleanup error:", cloudErr);
      }
    }

    await listing.deleteOne();
    res.json({ message: "Sale listing deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * SubAdmin+: Get all pending sale listings for approval.
 */
export const getPendingSaleListings = async (req, res) => {
  try {
    const listings = await VehicleSaleListing.find({ status: "Pending" })
      .populate("seller", "name email phone profilePic")
      .sort({ createdAt: 1 })
      .lean();
    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * SubAdmin+: Approve a sale listing.
 */
export const approveSaleListing = async (req, res) => {
  try {
    const listing = await VehicleSaleListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    listing.status = "Approved";
    listing.approvedAt = new Date();
    await listing.save();

    res.json({ message: "Sale listing approved", listing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * SubAdmin+: Reject a sale listing with reason.
 */
export const rejectSaleListing = async (req, res) => {
  try {
    const listing = await VehicleSaleListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    const { reason, comment } = req.body;

    listing.status = "Rejected";
    listing.rejectionReason = reason || "Does not meet guidelines";
    listing.rejectionComment = comment || null;
    listing.rejectedAt = new Date();
    await listing.save();

    res.json({ message: "Sale listing rejected", listing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Admin: Get ALL sale listings (any status) for management.
 */
export const getAllSaleListings = async (req, res) => {
  try {
    const listings = await VehicleSaleListing.find()
      .populate("seller", "name email phone profilePic")
      .sort({ createdAt: -1 })
      .lean();
    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

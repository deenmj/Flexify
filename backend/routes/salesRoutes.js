import express from "express";
import { protect, requireStaff, requireSalesVerified } from "../middleware/authMiddleware.js";
import VehicleSale from "../models/VehicleSale.js";
import { upload } from "../utils/upload.js";

const router = express.Router();

/**
 * @route   POST /api/sales/vehicles
 * @desc    Create a new vehicle listing for sale
 * @access  Private (Staff/Admin/Superadmin only)
 */
router.post("/vehicles", protect, requireSalesVerified, upload.array("images", 10), async (req, res) => {
  try {
    const {
      make,
      model,
      year,
      registrationNumber,
      vin,
      mileage,
      fuelType,
      transmission,
      condition,
      category,
      askingPrice,
      commissionRate,
      isNegotiable,
      title,
      description,
      seoTags,
      contactNumber,
      originalOwnerDetails: ownerDetailsStr,
      status,
    } = req.body;

    let originalOwnerDetails;
    try {
      originalOwnerDetails = ownerDetailsStr ? JSON.parse(ownerDetailsStr) : null;
    } catch (e) {
      return res.status(400).json({ message: "Invalid owner details format" });
    }

    // Process uploaded images from Cloudinary
    const images = req.files ? req.files.map((file) => file.path) : [];

    // Validate required fields
    if (!make || !model || !year || !mileage || !fuelType || !transmission || !condition || !askingPrice || !title || !originalOwnerDetails?.name || !originalOwnerDetails?.phone) {
      return res.status(400).json({ message: "Please provide all required fields." });
    }

    const newSale = new VehicleSale({
      make,
      model,
      year,
      registrationNumber,
      vin,
      mileage,
      fuelType,
      transmission,
      condition,
      category: category ? (Array.isArray(category) ? category : JSON.parse(category)) : [],
      askingPrice,
      commissionRate: commissionRate || 0,
      isNegotiable: isNegotiable || false,
      title,
      description,
      seoTags: seoTags ? (Array.isArray(seoTags) ? seoTags : JSON.parse(seoTags)) : [],
      contactNumber,
      images: images || [],
      listedBy: req.user._id, // Bind the staff member creating it
      assignedStaff: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
      },
      originalOwnerDetails,
      status: status || "Available",
    });

    const savedSale = await newSale.save();
    res.status(201).json(savedSale);
  } catch (error) {
    console.error("Error creating vehicle sale:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @route   PUT /api/sales/vehicles/:id
 * @desc    Update an existing vehicle listing for sale
 * @access  Private (Staff/Admin/Superadmin only)
 */
router.put("/vehicles/:id", protect, upload.array("images", 10), async (req, res) => {
  try {
    const saleId = req.params.id;
    const sale = await VehicleSale.findById(saleId);
    if (!sale) return res.status(404).json({ message: "Vehicle sale not found" });

    // Moderation Override Logic
    const isOwner = sale.listedBy.toString() === req.user._id.toString();
    const isMasterAdmin = ["admin", "superadmin"].includes(req.user.role);

    if (!isOwner && !isMasterAdmin) {
      return res.status(403).json({ message: "Forbidden: You do not have permission to edit this listing. Staff cannot edit other's listings." });
    }

    const {
      make, model, year, registrationNumber, vin, mileage, fuelType, transmission,
      condition, category, askingPrice, commissionRate, isNegotiable, title, description,
      seoTags, contactNumber, originalOwnerDetails: ownerDetailsStr, status,
      existingImages: existingImagesStr
    } = req.body;

    if (ownerDetailsStr) {
      try {
        sale.originalOwnerDetails = JSON.parse(ownerDetailsStr);
      } catch (e) {
        return res.status(400).json({ message: "Invalid owner details format" });
      }
    }

    let existingImages = [];
    if (existingImagesStr) {
      try {
        existingImages = JSON.parse(existingImagesStr);
      } catch (e) {}
    }

    const newImages = req.files ? req.files.map((file) => file.path) : [];
    sale.images = [...existingImages, ...newImages];

    if (make) sale.make = make;
    if (model) sale.model = model;
    if (year) sale.year = year;
    if (registrationNumber !== undefined) sale.registrationNumber = registrationNumber;
    if (vin) sale.vin = vin;
    if (mileage) sale.mileage = mileage;
    if (fuelType) sale.fuelType = fuelType;
    if (transmission) sale.transmission = transmission;
    if (condition) sale.condition = condition;
    if (category) sale.category = Array.isArray(category) ? category : JSON.parse(category);
    if (askingPrice) sale.askingPrice = askingPrice;
    if (commissionRate !== undefined) sale.commissionRate = commissionRate;
    if (isNegotiable !== undefined) sale.isNegotiable = isNegotiable;
    if (title) sale.title = title;
    if (description) sale.description = description;
    if (seoTags) sale.seoTags = Array.isArray(seoTags) ? seoTags : JSON.parse(seoTags);
    if (contactNumber) sale.contactNumber = contactNumber;
    if (status) sale.status = status;

    const savedSale = await sale.save();
    res.json(savedSale);
  } catch (error) {
    console.error("Error updating vehicle sale:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @route   GET /api/sales/staff/vehicles
 * @desc    Get all active vehicle sales with full details for staff
 * @access  Private (Staff/Admin/Superadmin only)
 */
router.get("/staff/vehicles", protect, async (req, res) => {
  try {
    const isStaff = ['staff', 'admin', 'superadmin', 'subadmin'].includes(req.user.role);
    const query = isStaff ? {} : { 'seller': req.user._id };
    
    const sales = await VehicleSale.find(query)
    .sort("-createdAt");
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @route   GET /api/sales/vehicles
 * @desc    Get all active vehicle sales (Public or Staff)
 * @access  Public
 */
router.get("/vehicles", async (req, res) => {
  try {
    const { 
      search, 
      category, 
      minPrice, 
      maxPrice, 
      location, 
      condition, 
      transmission, 
      datePublished 
    } = req.query;
    
    let query = { status: { $in: ["Available", "New", "Sold Out"] } };
    
    if (category && category !== 'All') {
      query.category = { $in: category.split(',') };
    }
    
    if (minPrice || maxPrice) {
      query.askingPrice = {};
      if (minPrice) query.askingPrice.$gte = Number(minPrice);
      if (maxPrice) query.askingPrice.$lte = Number(maxPrice);
    }

    if (condition) {
      query.condition = condition;
    }

    if (transmission) {
      query.transmission = transmission;
    }

    if (datePublished) {
      const days = parseInt(datePublished, 10);
      if (!isNaN(days) && days > 0) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);
        query.createdAt = { $gte: dateLimit };
      }
    }
    
    if (search || location) {
      const searchTerms = [];
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        searchTerms.push(
          { title: searchRegex },
          { make: searchRegex },
          { model: searchRegex }
        );
      }
      
      if (location) {
        const locationRegex = new RegExp(location, 'i');
        searchTerms.push(
          { 'location.address': locationRegex }
        );
        // Also allow search by title/desc if location is in text
        if (!search) { // If no global search, use location to search text too just in case
          searchTerms.push({ title: locationRegex }, { description: locationRegex });
        }
      }
      
      if (searchTerms.length > 0) {
        query.$or = searchTerms;
      }
    }

    const sales = await VehicleSale.find(query)
    .select("-originalOwnerDetails")
    .sort("-createdAt");
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @route   GET /api/sales/vehicles/:id
 * @desc    Get a single vehicle sale by ID
 * @access  Public
 */
router.get("/vehicles/:id", async (req, res) => {
  try {
    const sale = await VehicleSale.findById(req.params.id)
      .select("-originalOwnerDetails");
      
    if (!sale) {
      return res.status(404).json({ message: "Sale listing not found" });
    }
    
    res.json(sale);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @route   PUT /api/sales/vehicles/:id/status
 * @desc    Update vehicle sale status
 * @access  Private (Staff/Admin/Superadmin only)
 */
router.put("/vehicles/:id/status", protect, requireStaff, async (req, res) => {
  try {
    const { status, finalNegotiatedPrice } = req.body;
    
    if (!["Available", "New", "Sold Out"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const sale = await VehicleSale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: "Sale listing not found" });
    }

    sale.status = status;
    
    // Handle final sale negotiation
    if (status === 'Sold Out' && finalNegotiatedPrice) {
      sale.finalNegotiatedPrice = finalNegotiatedPrice;
      const profit = finalNegotiatedPrice * ((sale.commissionRate || 0) / 100);
      sale.profitEarned = profit;
    }

    const updatedSale = await sale.save();
    
    res.json(updatedSale);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;



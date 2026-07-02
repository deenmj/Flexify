import express from "express";
import { protect, requireStaff } from "../middleware/authMiddleware.js";
import VehicleSale from "../models/VehicleSale.js";
import { upload } from "../utils/upload.js";

const router = express.Router();

/**
 * @route   POST /api/sales/vehicles
 * @desc    Create a new vehicle listing for sale
 * @access  Private (Staff/Admin/Superadmin only)
 */
router.post("/vehicles", protect, requireStaff, upload.array("images", 10), async (req, res) => {
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
      askingPrice,
      commissionRate,
      isNegotiable,
      title,
      description,
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
    if (!make || !model || !year || !registrationNumber || !mileage || !fuelType || !transmission || !condition || !askingPrice || !title || !originalOwnerDetails?.name || !originalOwnerDetails?.phone) {
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
      askingPrice,
      commissionRate: commissionRate || 0,
      isNegotiable: isNegotiable || false,
      title,
      description,
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
 * @route   GET /api/sales/vehicles
 * @desc    Get all active vehicle sales (Public or Staff)
 * @access  Public
 */
router.get("/vehicles", async (req, res) => {
  try {
    const sales = await VehicleSale.find({ 
      status: { $in: ["Available", "New", "Sold Out"] } 
    })
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
    const { status } = req.body;
    
    if (!["Available", "New", "Sold Out"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const sale = await VehicleSale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: "Sale listing not found" });
    }

    sale.status = status;
    const updatedSale = await sale.save();
    
    res.json(updatedSale);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;

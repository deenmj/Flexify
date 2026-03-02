// backend/controllers/subadminController.js
// SUBADMIN controller — KYC review + vehicle approval
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";

/**
 * List users with pending KYC verification
 */
export const getPendingUsers = async (req, res) => {
    try {
        const users = await User.find({ verificationStatus: "pending" })
            .select("-password")
            .sort({ updatedAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Get a user's KYC details for review
 */
export const getUserKycDetails = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Approve user KYC
 */
export const approveUserKyc = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.isKycVerified = true;
        user.verificationStatus = "approved";

        // If user is an owner, promote to VERIFIED owner
        if (user.role === "owner" && user.ownerType === "UNVERIFIED") {
            user.ownerType = "VERIFIED";
        }

        await user.save();
        res.json({ message: "User KYC approved successfully", user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Reject user KYC
 */
export const rejectUserKyc = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.verificationStatus = "rejected";
        user.isKycVerified = false;

        await user.save();
        res.json({ message: "User KYC rejected", user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * List vehicles pending approval (from unverified owners)
 */
export const getPendingVehicles = async (req, res) => {
    try {
        const vehicles = await Vehicle.find({ status: "pending" })
            .populate("owner", "name email role ownerType")
            .sort({ createdAt: -1 });
        res.json(vehicles);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Approve vehicle listing
 */
export const approveVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id).populate("owner");
        if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

        vehicle.status = "active";
        await vehicle.save();

        // Optionally promote owner to VERIFIED if they were UNVERIFIED
        if (vehicle.owner && vehicle.owner.role === "owner" && vehicle.owner.ownerType === "UNVERIFIED") {
            vehicle.owner.ownerType = "VERIFIED";
            await vehicle.owner.save();
        }

        res.json({ message: "Vehicle approved and now active", vehicle });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Reject vehicle listing
 */
export const rejectVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

        vehicle.status = "rejected";
        await vehicle.save();

        res.json({ message: "Vehicle rejected", vehicle });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Dashboard stats for subadmin
 */
export const getSubadminStats = async (req, res) => {
    try {
        const pendingUsers = await User.countDocuments({ verificationStatus: "pending" });
        const pendingVehicles = await Vehicle.countDocuments({ status: "pending" });
        const approvedUsers = await User.countDocuments({ verificationStatus: "approved" });
        const totalVehicles = await Vehicle.countDocuments({ status: "active" });

        res.json({ pendingUsers, pendingVehicles, approvedUsers, totalVehicles });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

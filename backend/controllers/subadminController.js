// backend/controllers/subadminController.js
// SUBADMIN controller — KYC review + vehicle approval
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import VehicleMake from "../models/VehicleMake.js";
import VehicleModel from "../models/VehicleModel.js";
import { sendRejectionEmail, sendApprovalEmail } from "../utils/notifier.js";

/**
 * List users who have submitted KYC documents for staff review
 * (Documents are auto-approved but staff can review and take action)
 */
export const getPendingUsers = async (req, res) => {
    try {
        const users = await User.find({ verificationStatus: "pending" })
            .select("-password")
            .sort({ kycVerifiedAt: -1, updatedAt: -1 });
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
        user.kycVerifiedAt = new Date();

        // If user is an owner, promote to VERIFIED owner
        if (user.role === "owner" && user.ownerType === "UNVERIFIED") {
            user.ownerType = "VERIFIED";
        }

        // Clear rejection fields on approval
        user.rejectionReason = null;
        user.rejectionComment = null;
        user.rejectedAt = null;

        await user.save();
        
        // Send approval email async
        sendApprovalEmail(user, "KYC");

        // SOCKET NOTIFICATION TO ALL ADMINS
        const io = req.app.get("io");
        if (io) {
            io.to("admin_room").emit("pendingUpdate", { type: "KYC", status: "approved" });
        }

        res.json({ message: "User KYC approved successfully", user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Reject/Revoke user KYC — revokes access and notifies user to resubmit
 */
export const rejectUserKyc = async (req, res) => {
    const { reason, comment } = req.body;

    if (!reason) {
        return res.status(400).json({ message: "Rejection reason is required" });
    }

    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Revoke KYC verification — user will need to resubmit
        user.verificationStatus = "rejected";
        user.isKycVerified = false;
        user.rejectionReason = reason;
        user.rejectionComment = comment;
        user.rejectedAt = new Date();

        // If owner, revert to UNVERIFIED
        if (user.role === "owner" && user.ownerType === "VERIFIED") {
            user.ownerType = "UNVERIFIED";
        }

        await user.save();

        // SOCKET NOTIFICATION TO ALL ADMINS
        const io = req.app.get("io");
        if (io) {
            io.to("admin_room").emit("pendingUpdate", { type: "KYC", status: "rejected" });
        }

        // Send feedback email async
        sendRejectionEmail(user, "KYC", reason, comment);

        res.json({ message: "User KYC revoked and notification sent", user });
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
        // Clear rejection fields
        vehicle.rejectionReason = null;
        vehicle.rejectionComment = null;
        vehicle.rejectedAt = null;
        
        await vehicle.save();

        // Send approval email async
        if (vehicle.owner) {
            sendApprovalEmail(vehicle.owner, "Vehicle", vehicle.title);
        }

        // Optionally promote owner to VERIFIED if they were UNVERIFIED
        if (vehicle.owner && vehicle.owner.role === "owner" && vehicle.owner.ownerType === "UNVERIFIED") {
            vehicle.owner.ownerType = "VERIFIED";
            await vehicle.owner.save();
        }

        res.json({ message: "Vehicle approved and now active", vehicle });

        // SOCKET NOTIFICATION TO ALL ADMINS
        const io = req.app.get("io");
        if (io) {
            io.to("admin_room").emit("pendingUpdate", { type: "VEHICLE", status: "approved" });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Reject vehicle listing
 */
export const rejectVehicle = async (req, res) => {
    const { reason, comment } = req.body;

    if (!reason) {
        return res.status(400).json({ message: "Rejection reason is required" });
    }

    try {
        const vehicle = await Vehicle.findById(req.params.id).populate("owner");
        if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

        vehicle.status = "rejected";
        vehicle.rejectionReason = reason;
        vehicle.rejectionComment = comment;
        vehicle.rejectedAt = new Date();

        await vehicle.save();

        if (vehicle.owner) {
            sendRejectionEmail(vehicle.owner, "Vehicle", reason, comment);
        }

        res.json({ message: "Vehicle rejected and notification sent", vehicle });

        // SOCKET NOTIFICATION TO ALL ADMINS
        const io = req.app.get("io");
        if (io) {
            io.to("admin_room").emit("pendingUpdate", { type: "VEHICLE", status: "rejected" });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Dashboard stats for subadmin
 */
export const getSubadminStats = async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const pendingUsers = await User.countDocuments({ verificationStatus: "pending" });
        const pendingVehicles = await Vehicle.countDocuments({ status: "pending" });
        const pendingMakes = await VehicleMake.countDocuments({ approved: false });
        const pendingModels = await VehicleModel.countDocuments({ approved: false });
        const approvedToday = await User.countDocuments({ 
            verificationStatus: "approved",
            kycVerifiedAt: { $gte: todayStart }
        });
        const totalVehicles = await Vehicle.countDocuments({ status: "active" });

        res.json({ pendingUsers, pendingVehicles, pendingMakes, pendingModels, approvedToday, totalVehicles });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * List pending makes
 */
export const getPendingMakes = async (req, res) => {
    try {
        const makes = await VehicleMake.find({ approved: false }).populate("createdBy", "name email");
        res.json(makes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * List pending models
 */
export const getPendingModels = async (req, res) => {
    try {
        const models = await VehicleModel.find({ approved: false })
            .populate("make")
            .populate("createdBy", "name email");
        res.json(models);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Approve make
 */
export const approveMake = async (req, res) => {
    try {
        const make = await VehicleMake.findById(req.params.id);
        if (!make) return res.status(404).json({ message: "Make not found" });
        make.approved = true;
        await make.save();
        res.json({ message: "Make approved", make });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Approve model
 */
export const approveModel = async (req, res) => {
    try {
        const model = await VehicleModel.findById(req.params.id);
        if (!model) return res.status(404).json({ message: "Model not found" });
        model.approved = true;
        await model.save();
        res.json({ message: "Model approved", model });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Delete make
 */
export const deleteMake = async (req, res) => {
    try {
        await VehicleMake.findByIdAndDelete(req.params.id);
        res.json({ message: "Make deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Delete model
 */
export const deleteModel = async (req, res) => {
    try {
        await VehicleModel.findByIdAndDelete(req.params.id);
        res.json({ message: "Model deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

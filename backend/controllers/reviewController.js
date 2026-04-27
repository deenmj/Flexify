import Review from "../models/Review.js";
import Vehicle from "../models/Vehicle.js";
import Booking from "../models/booking.js";
import { sendRejectionEmail } from "../utils/notifier.js";

// Helper to update vehicle rating stats
const updateVehicleRating = async (vehicleId) => {
  const stats = await Review.aggregate([
    { $match: { vehicle: vehicleId, status: "visible" } },
    {
      $group: {
        _id: "$vehicle",
        avgRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Vehicle.findByIdAndUpdate(vehicleId, {
      averageRating: Math.round(stats[0].avgRating * 10) / 10,
      reviewCount: stats[0].reviewCount,
    });
  } else {
    await Vehicle.findByIdAndUpdate(vehicleId, {
      averageRating: 0,
      reviewCount: 0,
    });
  }
};

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private
export const createReview = async (req, res) => {
  const { bookingId, rating, comment } = req.body;

  try {
    const booking = await Booking.findById(bookingId).populate("vehicle");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if user is the one who booked
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to review this booking" });
    }

    // Check if booking is completed or confirmed
    if (booking.status !== "COMPLETED" && booking.status !== "CONFIRMED") {
      return res.status(400).json({ message: "Only confirmed or completed bookings can be reviewed" });
    }

    // NEW: Ensure the trip has actually ended before allowing a review
    const tripEndDate = new Date(booking.endDate);
    const now = new Date();
    if (now < tripEndDate) {
      return res.status(400).json({ message: "You can only leave a review after the trip has ended." });
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
      return res.status(400).json({ message: "Booking already reviewed" });
    }

    const review = await Review.create({
      booking: bookingId,
      reviewer: req.user._id,
      reviewedOwner: booking.owner,
      vehicle: booking.vehicle._id,
      rating: Number(rating),
      comment,
    });

    await updateVehicleRating(booking.vehicle._id);
    booking.isReviewed = true;
    await booking.save();

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get reviews for a vehicle
// @route   GET /api/vehicles/:id/reviews
// @access  Public
export const getVehicleReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ vehicle: req.params.id, status: "visible" })
      .populate("reviewer", "name profilePic")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update review status (Moderation)
// @route   PATCH /api/subadmin/reviews/:id/status
// @access  Private (Subadmin/Superadmin)
export const updateReviewStatus = async (req, res) => {
  const { status, reason, comment } = req.body; // 'visible', 'hidden', or 'rejected'

  if (status === "rejected" && !reason) {
    return res.status(400).json({ message: "Rejection reason is required" });
  }

  try {
    const review = await Review.findById(req.params.id).populate("reviewer");
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    review.status = status;

    if (status === "rejected") {
      review.rejectionReason = reason;
      review.rejectionComment = comment;
      review.rejectedAt = new Date();
      
      // Notify reviewer
      if (review.reviewer) {
        sendRejectionEmail(review.reviewer, "Review", reason, comment);
      }
    } else {
      // Clear rejection if changing away from rejected
      review.rejectionReason = null;
      review.rejectionComment = null;
      review.rejectedAt = null;
    }

    await review.save();

    // Recalculate rating
    await updateVehicleRating(review.vehicle);

    res.json({ message: `Review status updated to ${status}`, review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all reviews (Moderation)
// @route   GET /api/subadmin/reviews
// @access  Private (Subadmin/Superadmin)
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("reviewer", "name email profilePic")
      .populate("vehicle", "title make model")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Get reviews for owner's vehicles
// @route   GET /api/reviews/owner
// @access  Private (Owner)
export const getOwnerReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ reviewedOwner: req.user._id })
      .populate("reviewer", "name profilePic")
      .populate("vehicle", "title make model")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Hide/Unhide review (Owner Self-Moderation)
// @route   PATCH /api/reviews/:id/hide
// @access  Private (Verified Owner)
export const hideReviewByOwner = async (req, res) => {
  try {
    if (req.user.role !== "owner" || req.user.ownerType !== "VERIFIED") {
      return res.status(403).json({ message: "Only verified owners can moderate reviews" });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Verify ownership
    if (review.reviewedOwner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to moderate this review" });
    }

    // Toggle visibility
    if (review.status === "visible") {
      review.status = "hidden";
      review.hiddenBy = req.user._id;
      review.hiddenAt = new Date();
    } else if (review.status === "hidden" && review.hiddenBy?.toString() === req.user._id.toString()) {
      // Only allow unhiding if hidden by the owner (sub-admin can override via their own endpoint)
      review.status = "visible";
      review.hiddenBy = null;
      review.hiddenAt = null;
    } else {
      return res.status(400).json({ message: "Cannot toggle visibility of this review in its current state" });
    }

    await review.save();
    await updateVehicleRating(review.vehicle);

    res.json({ message: `Review is now ${review.status}`, review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

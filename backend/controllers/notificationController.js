import Notification from "../models/Notification.js";

// Utility function to create and emit a notification
export const createNotification = async (io, userId, title, message, type = "system", relatedId = null) => {
  try {
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type,
      relatedId,
    });

    if (io) {
      // Emit to the user's specific room
      io.to(userId.toString()).emit("newNotification", notification);
    }

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error.message);
    return null;
  }
};

// @desc    Get user notifications (paginated)
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const total = await Notification.countDocuments({ user: req.user._id });

    res.json({
      notifications,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error fetching notifications" });
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread
// @access  Private
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
    res.json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ message: "Server error fetching unread count" });
  }
};

// @desc    Mark a notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Security check
    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to access this notification" });
    }

    notification.isRead = true;
    await notification.save();

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: "Server error marking notification as read" });
  }
};

// @desc    Mark all notifications as read
// @route   POST /api/notifications/mark-all-read
// @access  Private
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Server error marking all notifications as read" });
  }
};

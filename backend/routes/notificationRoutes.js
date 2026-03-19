import express from "express";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/")
  .get(protect, getNotifications);

router.route("/unread")
  .get(protect, getUnreadCount);

router.route("/mark-all-read")
  .post(protect, markAllAsRead);

router.route("/:id/read")
  .patch(protect, markAsRead);

export default router;

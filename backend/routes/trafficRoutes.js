// backend/routes/trafficRoutes.js
import express from "express";
import { trackPageVisit } from "../controllers/trafficController.js";

const router = express.Router();

// Public: Track page view on client route change
router.post("/track", trackPageVisit);

export default router;

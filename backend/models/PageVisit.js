// backend/models/PageVisit.js
import mongoose from "mongoose";

const pageVisitSchema = new mongoose.Schema(
  {
    visitorId: {
      type: String,
      required: true,
      index: true,
    },
    path: {
      type: String,
      required: true,
      index: true,
    },
    referrer: {
      type: String,
      default: "",
    },
    source: {
      type: String, // "Facebook Ads", "Facebook", "Instagram", "Google", "Direct", etc.
      default: "Direct",
      index: true,
    },
    utmSource: {
      type: String,
      default: "",
    },
    utmMedium: {
      type: String,
      default: "",
    },
    utmCampaign: {
      type: String,
      default: "",
      index: true,
    },
    isFbAd: {
      type: Boolean,
      default: false,
      index: true,
    },
    device: {
      type: String,
      enum: ["mobile", "tablet", "desktop"],
      default: "desktop",
    },
    date: {
      type: String, // "YYYY-MM-DD"
      index: true,
    },
    hour: {
      type: Number, // 0 - 23
      index: true,
    },
  },
  { timestamps: true }
);

pageVisitSchema.index({ createdAt: -1 });
pageVisitSchema.index({ date: 1, isFbAd: 1 });
pageVisitSchema.index({ date: 1, visitorId: 1 });
pageVisitSchema.index({ date: 1, source: 1 });

const PageVisit = mongoose.model("PageVisit", pageVisitSchema);
export default PageVisit;

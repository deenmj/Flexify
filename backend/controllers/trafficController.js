// backend/controllers/trafficController.js
import PageVisit from "../models/PageVisit.js";

/**
 * Public: Track page view / visitor arrival (called on route change)
 */
export const trackPageVisit = async (req, res) => {
  try {
    const {
      visitorId,
      path: reqPath,
      referrer = "",
      source = "Direct",
      utmSource = "",
      utmMedium = "",
      utmCampaign = "",
      isFbAd = false,
      device = "desktop",
    } = req.body;

    if (!visitorId || !reqPath) {
      return res.status(400).json({ message: "visitorId and path are required" });
    }

    // Ignore admin/staff route visits from traffic stats
    if (
      reqPath.startsWith("/admin") ||
      reqPath.startsWith("/superadmin") ||
      reqPath.startsWith("/staff")
    ) {
      return res.json({ ok: true, ignored: true });
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const hour = now.getHours();

    // Clean source label
    let cleanSource = source;
    if (isFbAd) {
      cleanSource = "Facebook Ads";
    }

    await PageVisit.create({
      visitorId,
      path: reqPath,
      referrer,
      source: cleanSource,
      utmSource,
      utmMedium,
      utmCampaign,
      isFbAd: Boolean(isFbAd),
      device: ["mobile", "tablet", "desktop"].includes(device) ? device : "desktop",
      date: dateStr,
      hour,
    });

    res.json({ ok: true });
  } catch (err) {
    // Fire-and-forget: do not break frontend experience if tracking errors
    console.error("[trackPageVisit] Error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Admin: Get website traffic & Facebook Ads analytics
 */
export const getTrafficAnalytics = async (req, res) => {
  try {
    const { timeframe = "7d" } = req.query;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000);

    // ── 1. Summary Cards (Today, 7d, 30d, all-time) ─────────────────────────
    const [todayAgg, sevenDayAgg, thirtyDayAgg, allTimeCount, mobileCount, totalCount] = await Promise.all([
      // Today
      PageVisit.aggregate([
        { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
        {
          $group: {
            _id: null,
            pageViews: { $sum: 1 },
            uniqueVisitors: { $addToSet: "$visitorId" },
            fbAdVisitors: {
              $addToSet: {
                $cond: [{ $eq: ["$isFbAd", true] }, "$visitorId", "$$REMOVE"],
              },
            },
            fbAdViews: {
              $sum: { $cond: [{ $eq: ["$isFbAd", true] }, 1, 0] },
            },
          },
        },
      ]),
      // 7 Days
      PageVisit.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo, $lte: todayEnd } } },
        {
          $group: {
            _id: null,
            pageViews: { $sum: 1 },
            uniqueVisitors: { $addToSet: "$visitorId" },
            fbAdVisitors: {
              $addToSet: {
                $cond: [{ $eq: ["$isFbAd", true] }, "$visitorId", "$$REMOVE"],
              },
            },
            fbAdViews: {
              $sum: { $cond: [{ $eq: ["$isFbAd", true] }, 1, 0] },
            },
          },
        },
      ]),
      // 30 Days
      PageVisit.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo, $lte: todayEnd } } },
        {
          $group: {
            _id: null,
            pageViews: { $sum: 1 },
            uniqueVisitors: { $addToSet: "$visitorId" },
            fbAdVisitors: {
              $addToSet: {
                $cond: [{ $eq: ["$isFbAd", true] }, "$visitorId", "$$REMOVE"],
              },
            },
            fbAdViews: {
              $sum: { $cond: [{ $eq: ["$isFbAd", true] }, 1, 0] },
            },
          },
        },
      ]),
      // All-time count
      PageVisit.countDocuments(),
      // Device breakdown (last 30d)
      PageVisit.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
        device: { $in: ["mobile", "tablet"] },
      }),
      PageVisit.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      }),
    ]);

    const td = todayAgg[0] || { pageViews: 0, uniqueVisitors: [], fbAdVisitors: [], fbAdViews: 0 };
    const sd = sevenDayAgg[0] || { pageViews: 0, uniqueVisitors: [], fbAdVisitors: [], fbAdViews: 0 };
    const m30 = thirtyDayAgg[0] || { pageViews: 0, uniqueVisitors: [], fbAdVisitors: [], fbAdViews: 0 };

    const mobilePercent = totalCount > 0 ? Math.round((mobileCount / totalCount) * 100) : 100;

    // ── 2. Time-series Chart Data ───────────────────────────────────────────
    let chartData = [];

    if (timeframe === "today") {
      // 24 Hourly buckets
      const hourlyAgg = await PageVisit.aggregate([
        { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
        {
          $group: {
            _id: { hour: "$hour" },
            pageViews: { $sum: 1 },
            uniqueVisitors: { $addToSet: "$visitorId" },
            fbAds: { $sum: { $cond: [{ $eq: ["$isFbAd", true] }, 1, 0] } },
          },
        },
      ]);

      const hourMap = new Map();
      hourlyAgg.forEach((h) => {
        hourMap.set(h._id.hour, {
          pageViews: h.pageViews,
          visitors: h.uniqueVisitors.length,
          fbAds: h.fbAds,
        });
      });

      for (let h = 0; h < 24; h++) {
        const label = `${String(h).padStart(2, "0")}:00`;
        const item = hourMap.get(h) || { pageViews: 0, visitors: 0, fbAds: 0 };
        chartData.push({
          key: label,
          label,
          hour: h,
          pageViews: item.pageViews,
          visitors: item.visitors,
          fbAds: item.fbAds,
        });
      }
    } else if (timeframe === "lifetime") {
      // Monthly buckets
      const monthlyAgg = await PageVisit.aggregate([
        {
          $group: {
            _id: { month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } } },
            pageViews: { $sum: 1 },
            uniqueVisitors: { $addToSet: "$visitorId" },
            fbAds: { $sum: { $cond: [{ $eq: ["$isFbAd", true] }, 1, 0] } },
          },
        },
        { $sort: { "_id.month": 1 } },
      ]);

      const monthMap = new Map();
      monthlyAgg.forEach((m) => {
        monthMap.set(m._id.month, {
          pageViews: m.pageViews,
          visitors: m.uniqueVisitors.length,
          fbAds: m.fbAds,
        });
      });

      // Show past 6 to 12 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        const item = monthMap.get(mKey) || { pageViews: 0, visitors: 0, fbAds: 0 };
        chartData.push({
          key: mKey,
          label,
          pageViews: item.pageViews,
          visitors: item.visitors,
          fbAds: item.fbAds,
        });
      }
    } else {
      // Daily buckets: 7d or 30d
      const numDays = timeframe === "30d" ? 30 : 7;
      const startDate = new Date(todayStart.getTime() - (numDays - 1) * 24 * 60 * 60 * 1000);

      const dailyAgg = await PageVisit.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: todayEnd } } },
        {
          $group: {
            _id: { date: "$date" },
            pageViews: { $sum: 1 },
            uniqueVisitors: { $addToSet: "$visitorId" },
            fbAds: { $sum: { $cond: [{ $eq: ["$isFbAd", true] }, 1, 0] } },
          },
        },
      ]);

      const dateMap = new Map();
      dailyAgg.forEach((d) => {
        dateMap.set(d._id.date, {
          pageViews: d.pageViews,
          visitors: d.uniqueVisitors.length,
          fbAds: d.fbAds,
        });
      });

      for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
        const dKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const item = dateMap.get(dKey) || { pageViews: 0, visitors: 0, fbAds: 0 };
        chartData.push({
          key: dKey,
          label,
          pageViews: item.pageViews,
          visitors: item.visitors,
          fbAds: item.fbAds,
        });
      }
    }

    // ── 3. Traffic Channels Breakdown (Facebook Ads, Instagram, Direct, etc.) ─
    const rangeDate = timeframe === "today" ? todayStart : timeframe === "30d" ? thirtyDaysAgo : sevenDaysAgo;
    const sourcesAgg = await PageVisit.aggregate([
      { $match: { createdAt: { $gte: rangeDate } } },
      {
        $group: {
          _id: "$source",
          visitors: { $addToSet: "$visitorId" },
          pageViews: { $sum: 1 },
        },
      },
      { $sort: { pageViews: -1 } },
      { $limit: 8 },
    ]);

    const totalPeriodViews = sourcesAgg.reduce((sum, s) => sum + s.pageViews, 0);
    const sources = sourcesAgg.map((s) => ({
      name: s._id || "Direct",
      visitors: s.visitors.length,
      pageViews: s.pageViews,
      percent: totalPeriodViews > 0 ? Math.round((s.pageViews / totalPeriodViews) * 100) : 0,
    }));

    // ── 4. Facebook Campaigns Breakdown (utm_campaign) ──────────────────────
    const campaignsAgg = await PageVisit.aggregate([
      {
        $match: {
          createdAt: { $gte: rangeDate },
          $or: [{ isFbAd: true }, { utmCampaign: { $ne: "" } }],
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$utmCampaign", "Default Ad / fbclid"] },
          visitors: { $addToSet: "$visitorId" },
          pageViews: { $sum: 1 },
        },
      },
      { $sort: { visitors: -1 } },
      { $limit: 10 },
    ]);

    const campaigns = campaignsAgg.map((c) => ({
      campaign: c._id === "" ? "Default Facebook Ad (Auto-tagged)" : c._id,
      visitors: c.visitors.length,
      pageViews: c.pageViews,
    }));

    // ── 5. Top Landing Pages ────────────────────────────────────────────────
    const topPagesAgg = await PageVisit.aggregate([
      { $match: { createdAt: { $gte: rangeDate } } },
      {
        $group: {
          _id: "$path",
          views: { $sum: 1 },
        },
      },
      { $sort: { views: -1 } },
      { $limit: 6 },
    ]);

    const topPages = topPagesAgg.map((p) => ({
      path: p._id,
      views: p.views,
    }));

    res.json({
      summary: {
        visitorsToday: td.uniqueVisitors.length,
        pageViewsToday: td.pageViews,
        fbAdsToday: td.fbAdVisitors.length,
        visitors7d: sd.uniqueVisitors.length,
        pageViews7d: sd.pageViews,
        fbAds7d: sd.fbAdVisitors.length,
        visitors30d: m30.uniqueVisitors.length,
        pageViews30d: m30.pageViews,
        fbAds30d: m30.fbAdVisitors.length,
        totalAllTime: allTimeCount,
        mobilePercent,
      },
      chartData,
      sources,
      campaigns,
      topPages,
    });
  } catch (err) {
    console.error("[getTrafficAnalytics] Error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

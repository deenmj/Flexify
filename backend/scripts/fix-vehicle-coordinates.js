/**
 * Migration Script: Fix vehicles with [0, 0] or default center coordinates
 * 
 * This script finds all vehicles whose coordinates are at [0, 0] (Atlantic Ocean)
 * or at the generic Sri Lanka center [80.7718, 7.8731], and re-geocodes them
 * using their stored city/district/province fields via the Nominatim API.
 * 
 * Usage:
 *   node scripts/fix-vehicle-coordinates.js
 * 
 * Requirements:
 *   - MONGO_URI must be set in ../. env or environment
 *   - Internet access for Nominatim API calls
 *   - Run against your PRODUCTION database to fix existing listings
 */

import "dotenv/config.js";
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
dns.setDefaultResultOrder("ipv4first");

import mongoose from "mongoose";
import Vehicle from "../models/Vehicle.js";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const RATE_LIMIT_MS = 1100; // Nominatim requires 1 request/second max

// Coordinates to consider "bad" (within 0.01 degree tolerance)
const BAD_COORDINATES = [
  { lng: 0, lat: 0, label: "Atlantic Ocean [0,0]" },
  { lng: 80.7718, lat: 7.8731, label: "Sri Lanka Center (default)" },
];

function isBadCoordinate(coords) {
  if (!coords || coords.length < 2) return true;
  const [lng, lat] = coords;
  return BAD_COORDINATES.some(
    (bad) => Math.abs(lng - bad.lng) < 0.01 && Math.abs(lat - bad.lat) < 0.01
  );
}

async function geocode(query) {
  const url = `${NOMINATIM_BASE}?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=lk`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Rentify-Migration/1.0" },
  });
  const data = await res.json();
  if (data && data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  }
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("[FATAL] MONGO_URI not set. Cannot connect to database.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // Find vehicles with bad coordinates
  const allVehicles = await Vehicle.find({}).select(
    "title city district province location"
  );

  const badVehicles = allVehicles.filter((v) =>
    isBadCoordinate(v.location?.coordinates)
  );

  console.log(
    `\n📊 Found ${badVehicles.length} vehicles with bad coordinates out of ${allVehicles.length} total.\n`
  );

  if (badVehicles.length === 0) {
    console.log("🎉 All vehicles have valid coordinates. Nothing to fix!");
    await mongoose.disconnect();
    return;
  }

  let fixed = 0;
  let failed = 0;

  for (const vehicle of badVehicles) {
    const [lng, lat] = vehicle.location?.coordinates || [0, 0];
    const badType = BAD_COORDINATES.find(
      (b) => Math.abs(lng - b.lng) < 0.01 && Math.abs(lat - b.lat) < 0.01
    );

    console.log(
      `🔍 [${vehicle._id}] "${vehicle.title}" — Current: [${lng}, ${lat}] (${badType?.label || "unknown"})`
    );
    console.log(
      `   Location fields: city="${vehicle.city || ""}", district="${vehicle.district || ""}", province="${vehicle.province || ""}"`
    );

    // Build geocoding query from most specific to least
    const parts = [vehicle.city, vehicle.district, vehicle.province, "Sri Lanka"].filter(Boolean);
    const searchQuery = parts.join(", ");

    if (!searchQuery || searchQuery === "Sri Lanka") {
      console.log(`   ⚠️  No city/district/province data — skipping.\n`);
      failed++;
      continue;
    }

    console.log(`   🌐 Geocoding: "${searchQuery}"`);

    try {
      const result = await geocode(searchQuery);

      if (result) {
        await Vehicle.updateOne(
          { _id: vehicle._id },
          {
            $set: {
              "location.coordinates": [result.lng, result.lat],
            },
          }
        );
        console.log(
          `   ✅ Updated to [${result.lng}, ${result.lat}] (${result.displayName})\n`
        );
        fixed++;
      } else {
        // Try with just district + Sri Lanka
        const fallbackQuery = [vehicle.district, "Sri Lanka"].filter(Boolean).join(", ");
        console.log(`   🔄 First query failed, trying: "${fallbackQuery}"`);
        await sleep(RATE_LIMIT_MS);

        const fallbackResult = await geocode(fallbackQuery);
        if (fallbackResult) {
          await Vehicle.updateOne(
            { _id: vehicle._id },
            {
              $set: {
                "location.coordinates": [fallbackResult.lng, fallbackResult.lat],
              },
            }
          );
          console.log(
            `   ✅ Updated to [${fallbackResult.lng}, ${fallbackResult.lat}] (${fallbackResult.displayName})\n`
          );
          fixed++;
        } else {
          console.log(`   ❌ Geocoding failed for both queries.\n`);
          failed++;
        }
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
      failed++;
    }

    // Rate limit: Nominatim requires 1 request per second
    await sleep(RATE_LIMIT_MS);
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`📊 Migration Complete:`);
  console.log(`   ✅ Fixed: ${fixed}`);
  console.log(`   ❌ Failed/Skipped: ${failed}`);
  console.log(`   📦 Total processed: ${badVehicles.length}`);
  console.log(`${"=".repeat(50)}\n`);

  await mongoose.disconnect();
  console.log("🔌 Disconnected from MongoDB");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

import "dotenv/config.js";
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
dns.setDefaultResultOrder("ipv4first");

import mongoose from "mongoose";
import Vehicle from "./models/Vehicle.js";

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const res = await Vehicle.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [80.6006, 7.3603] },
        distanceField: 'distance',
        maxDistance: 10000,
        spherical: true
      }
    }
  ]);
  console.log('Found:', res.length, 'vehicles');
  if (res.length > 0) {
    console.log('First vehicle:', res[0].title, 'Owner:', res[0].owner, 'Distance:', res[0].distance);
  }
  process.exit(0);
}
test();

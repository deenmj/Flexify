import express from 'express';
import Vehicle from '../models/Vehicle.js';

const router = express.Router();

/**
 * Generates an SEO-friendly URL slug for a vehicle.
 * Format: make-model-year-location--id
 * (Must match frontend logic)
 */
const getVehicleSlug = (vehicle) => {
  const location = vehicle.city || vehicle.district || 'sri-lanka';
  const base = `${vehicle.make}-${vehicle.model}-${vehicle.year}-${location}`.toLowerCase();
  const slug = base.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  return `${slug}--${vehicle._id}`;
};

router.get('/sitemap.xml', async (req, res) => {
  try {
    // Only fetch active vehicles
    const vehicles = await Vehicle.find({ isActive: true, status: 'approved' })
      .select('make model year city district _id updatedAt')
      .lean();

    // Base URLs
    const baseUrls = [
      { url: 'https://rentify.lk/', priority: 1.0, changefreq: 'daily' },
      { url: 'https://rentify.lk/explore', priority: 0.9, changefreq: 'always' },
      { url: 'https://rentify.lk/about', priority: 0.7, changefreq: 'monthly' },
      { url: 'https://rentify.lk/contact', priority: 0.6, changefreq: 'monthly' },
      { url: 'https://rentify.lk/faq', priority: 0.6, changefreq: 'monthly' },
      { url: 'https://rentify.lk/list-vehicle', priority: 0.8, changefreq: 'weekly' },
      { url: 'https://rentify.lk/privacy', priority: 0.3, changefreq: 'yearly' },
      { url: 'https://rentify.lk/auth', priority: 0.5, changefreq: 'yearly' }
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Add static pages
    for (const page of baseUrls) {
      xml += `
  <url>
    <loc>${page.url}</loc>
    <priority>${page.priority}</priority>
    <changefreq>${page.changefreq}</changefreq>
  </url>`;
    }

    // Add dynamic vehicles
    for (const vehicle of vehicles) {
      const slug = getVehicleSlug(vehicle);
      const lastMod = vehicle.updatedAt ? new Date(vehicle.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      
      xml += `
  <url>
    <loc>https://rentify.lk/vehicles/${slug}</loc>
    <lastmod>${lastMod}</lastmod>
    <priority>0.8</priority>
    <changefreq>daily</changefreq>
  </url>`;
    }

    xml += `\n</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

export default router;



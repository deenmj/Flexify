import jwt from 'jsonwebtoken';
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import Staff from '../models/Staff.js';

export const maintenanceGuard = async (req, res, next) => {
  try {
    // 1. Check if maintenance mode is enabled in the database
    let maintenanceSetting = await Settings.findOne({ key: 'isMaintenanceMode' });
    
    // If setting doesn't exist, proceed as normal
    if (!maintenanceSetting) {
      return next();
    }
    
    // Check if it's stored as a boolean (legacy) or an object (new)
    const isMaintenanceActive = typeof maintenanceSetting.value === 'object' 
      ? maintenanceSetting.value.isMaintenanceMode 
      : maintenanceSetting.value === true;

    if (!isMaintenanceActive) {
      return next();
    }

    // 2. Allow specific paths to bypass the maintenance block completely
    const bypassPaths = [
      '/api/auth', // Bypass all auth routes (login, me, etc.) so staff can log in and stay logged in
      '/api/settings/maintenance' // Allow fetching/toggling the setting
    ];

    if (bypassPaths.some(path => req.originalUrl.startsWith(path))) {
      return next();
    }

    // 3. Check for Staff/Admin bypass via JWT
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        let user;
        if (decoded.isStaff) {
          user = await Staff.findById(decoded.id).select('-password');
        } else {
          user = await User.findById(decoded.id).select('-password');
        }

        if (user && (user.role === 'staff' || user.role === 'admin' || user.role === 'superadmin')) {
          // User is staff/admin, allow them through
          return next();
        }
      } catch (err) {
        // Token invalid or expired, continue to block
      }
    }

    // 4. Block the request
    return res.status(503).json({
      success: false,
      message: "We are currently upgrading our systems to serve you better. Rentify will be back shortly.",
      isMaintenance: true
    });

  } catch (error) {
    console.error("Maintenance Guard Error:", error);
    next(); // On DB error, fail open or close? Let's fail open to avoid locking the site down on DB glitches.
  }
};

const fs = require('fs');

let authMiddleware = fs.readFileSync('backend/middleware/authMiddleware.js', 'utf8');

authMiddleware = authMiddleware.replace(/\/\*\*\n \* requireKycVerified[\s\S]*?\}\n\};\n/g, '');
authMiddleware = authMiddleware.replace(/\/\*\*\n \* requireRentVerified[\s\S]*?\}\n\};\n/g, '');
authMiddleware = authMiddleware.replace(/\/\*\*\n \* requireSalesVerified[\s\S]*?\}\n\};\n/g, '');

fs.writeFileSync('backend/middleware/authMiddleware.js', authMiddleware);

let salesRoutes = fs.readFileSync('backend/routes/salesRoutes.js', 'utf8');
salesRoutes = salesRoutes.replace(/import \{ protect, requireSalesVerified \} from \"\.\.\/middleware\/authMiddleware\.js\";/g, 'import { protect } from "../middleware/authMiddleware.js";');
salesRoutes = salesRoutes.replace(/router\.post\(\"\/vehicles\", protect, requireSalesVerified/g, 'router.post("/vehicles", protect');
salesRoutes = salesRoutes.replace(/router\.put\(\"\/vehicles\/:id\", protect, requireSalesVerified/g, 'router.put("/vehicles/:id", protect');
salesRoutes = salesRoutes.replace(/router\.delete\(\"\/vehicles\/:id\", protect, requireSalesVerified/g, 'router.delete("/vehicles/:id", protect');

// Clean up salesRoutes commission logic
salesRoutes = salesRoutes.replace(/const \{[\s\S]*?commissionRate,[\s\S]*?\} = req\.body;/g, (match) => match.replace('commissionRate,', ''));
salesRoutes = salesRoutes.replace(/commissionRate: commissionRate \|\| 0,/g, '');
salesRoutes = salesRoutes.replace(/vehicle\.profitEarned =[\s\S]*?;/g, '');
salesRoutes = salesRoutes.replace(/const \{ finalNegotiatedPrice, status \} = req\.body;/g, 'const { status } = req.body;');

fs.writeFileSync('backend/routes/salesRoutes.js', salesRoutes);

let vehicleRoutes = fs.readFileSync('backend/routes/vehicleRoutes.js', 'utf8');
vehicleRoutes = vehicleRoutes.replace(/, requireRentVerified/g, '');
fs.writeFileSync('backend/routes/vehicleRoutes.js', vehicleRoutes);

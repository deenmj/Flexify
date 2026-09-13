const fs = require('fs');

// 1. adminRoutes.js
let adminRoutes = fs.readFileSync('backend/routes/adminRoutes.js', 'utf8');
adminRoutes = adminRoutes.replace(/router\.get\("\/users\/:id\/kyc"[\s\S]*?\n/g, '');
adminRoutes = adminRoutes.replace(/router\.delete\("\/users\/:id\/kyc"[\s\S]*?\n/g, '');
adminRoutes = adminRoutes.replace(/router\.patch\("\/users\/:id\/subscription"[\s\S]*?\n/g, '');
adminRoutes = adminRoutes.replace(/router\.get\("\/payments\/pending"[\s\S]*?\n/g, '');
adminRoutes = adminRoutes.replace(/router\.post\("\/payments\/verify"[\s\S]*?\n/g, '');
fs.writeFileSync('backend/routes/adminRoutes.js', adminRoutes);

// 2. subadminRoutes.js
let subadminRoutes = fs.readFileSync('backend/routes/subadminRoutes.js', 'utf8');
subadminRoutes = subadminRoutes.replace(/router\.get\("\/pending-users"[\s\S]*?\n/g, '');
subadminRoutes = subadminRoutes.replace(/router\.get\("\/user\/:id"[\s\S]*?\n/g, '');
subadminRoutes = subadminRoutes.replace(/router\.patch\("\/approve-user\/:id"[\s\S]*?\n/g, '');
subadminRoutes = subadminRoutes.replace(/router\.patch\("\/reject-user\/:id"[\s\S]*?\n/g, '');
subadminRoutes = subadminRoutes.replace(/router\.put\("\/user\/:id\/toggle-sales-access"[\s\S]*?\n/g, '');
fs.writeFileSync('backend/routes/subadminRoutes.js', subadminRoutes);

// 3. superAdminRoutes.js
let superAdminRoutes = fs.readFileSync('backend/routes/superAdminRoutes.js', 'utf8');
superAdminRoutes = superAdminRoutes.replace(/\/\/ Get global financials \(Placeholder\)[\s\S]*?\}\);\n\n/g, '');
superAdminRoutes = superAdminRoutes.replace(/const { maintenanceMode, globalCommission } = req\.body;/g, 'const { maintenanceMode } = req.body;');
superAdminRoutes = superAdminRoutes.replace(/settings: \{ maintenanceMode, globalCommission \}/g, 'settings: { maintenanceMode }');
fs.writeFileSync('backend/routes/superAdminRoutes.js', superAdminRoutes);


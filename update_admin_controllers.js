const fs = require('fs');

// 1. adminController.js
let adminController = fs.readFileSync('backend/controllers/adminController.js', 'utf8');

// Remove getUserKyc
adminController = adminController.replace(/\/\*\*\n \* Get user KYC documents[\s\S]*?\}\n\};\n/g, '');
// Remove deleteUserKyc
adminController = adminController.replace(/\/\*\*\n \* Delete user KYC documents[\s\S]*?\}\n\};\n/g, '');
// Remove updateUserSubscription
adminController = adminController.replace(/\/\*\*\n \* Update user subscription[\s\S]*?\}\n\};\n/g, '');
// Remove getPendingPayments
adminController = adminController.replace(/\/\*\*\n \* Superadmin: Get all pending subscription payments[\s\S]*?\}\n\};\n/g, '');
// Remove verifyPayment
adminController = adminController.replace(/\/\*\*\n \* Superadmin: Approve or Reject a payment[\s\S]*?\}\n\};\n/g, '');

// Fix getAdminStats
adminController = adminController.replace(/const pendingKyc = await User\.countDocuments\(\{ verificationStatus: \"pending\" \}\);/g, 'const pendingKyc = 0;');
adminController = adminController.replace(/\/\/ 5\. Platform Revenue from Subscriptions[\s\S]*?const totalPlatformRevenue = platformRevenue\[0\]\?\.total \|\| 0;/g, 'const totalPlatformRevenue = 0;');

fs.writeFileSync('backend/controllers/adminController.js', adminController);

// 2. subadminController.js
let subadminController = fs.readFileSync('backend/controllers/subadminController.js', 'utf8');

// Remove KYC methods
subadminController = subadminController.replace(/\/\*\*\n \* Get all pending users \(KYC\)[\s\S]*?\}\n\};\n/g, '');
subadminController = subadminController.replace(/\/\*\*\n \* Get specific user KYC details[\s\S]*?\}\n\};\n/g, '');
subadminController = subadminController.replace(/\/\*\*\n \* Approve user KYC[\s\S]*?\}\n\};\n/g, '');
subadminController = subadminController.replace(/\/\*\*\n \* Reject user KYC[\s\S]*?\}\n\};\n/g, '');
subadminController = subadminController.replace(/\/\*\*\n \* Toggle Sales Access[\s\S]*?\}\n\};\n/g, '');

// Fix getSubadminStats
subadminController = subadminController.replace(/const pendingUsers = await User\.countDocuments\(\{ verificationStatus: \"pending\" \}\);/g, 'const pendingUsers = 0;');

fs.writeFileSync('backend/controllers/subadminController.js', subadminController);


const fs = require('fs');

let notifier = fs.readFileSync('backend/utils/notifier.js', 'utf8');

notifier = notifier.replace(/\/\*\*\n \* Sends an email notification to a user when their KYC data is reset[\s\S]*?\}\n\};\n/g, '');
notifier = notifier.replace(/\/\*\*\n \* Sends a subscription expiry reminder[\s\S]*?\}\n\};\n/g, '');
notifier = notifier.replace(/\/\*\*\n \* Sends a notification when the grace period ends[\s\S]*?\}\n\};\n/g, '');

fs.writeFileSync('backend/utils/notifier.js', notifier);

let cloudinary = fs.readFileSync('backend/utils/cloudinary.js', 'utf8');
cloudinary = cloudinary.replace(/export const kycStorage[\s\S]*?\}\);\n/g, '');
cloudinary = cloudinary.replace(/export const receiptStorage[\s\S]*?\}\);\n/g, '');

fs.writeFileSync('backend/utils/cloudinary.js', cloudinary);

// Also clean up imports in userRoutes.js for kycStorage
let userRoutes = fs.readFileSync('backend/routes/userRoutes.js', 'utf8');
userRoutes = userRoutes.replace(/, kycStorage/g, '');
userRoutes = userRoutes.replace(/import \{ kycStorage, profileStorage \} from \"\.\.\/utils\/cloudinary\.js\";/g, 'import { profileStorage } from "../utils/cloudinary.js";');
userRoutes = userRoutes.replace(/const kycUpload = multer\(\{[\s\S]*?\}\);\n/g, '');

fs.writeFileSync('backend/routes/userRoutes.js', userRoutes);


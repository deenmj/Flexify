const fs = require('fs');

let content = fs.readFileSync('backend/routes/userRoutes.js', 'utf8');

// Remove /verify route completely
content = content.replace(/\/\*\*\n \* KYC verification submission[\s\S]*?\}\n\);\n/g, '');

// Remove /update-documents
content = content.replace(/\/\*\*\n \* Update verification documents[\s\S]*?\}\n\);\n/g, '');

// Remove pending sales functions
content = content.replace(/\/\*\*\n \* Get pending sales verification requests[\s\S]*?\}\);\n/g, '');
content = content.replace(/\/\*\*\n \* Approve sales verification request[\s\S]*?\}\);\n/g, '');
content = content.replace(/\/\*\*\n \* User requests sales access manually[\s\S]*?\}\);\n/g, '');
content = content.replace(/\/\*\*\n \* Admin fetch pending sales access requests[\s\S]*?\}\);\n/g, '');
content = content.replace(/\/\*\*\n \* Admin approve or reject sales access request[\s\S]*?\}\);\n/g, '');

// Fix /become-owner
content = content.replace(/user\.subscription = \{[\s\S]*?\};\n/g, '');
content = content.replace(/You are now registered as an owner! Free plan activated \(2 vehicle listings\)\. Submit KYC to get verified\./g, 'You are now registered as an owner! You can now list vehicles.');

// Fix update-profile
content = content.replace(/if \(req\.body\.name && !user\.isKycVerified\) user\.name = req\.body\.name;/g, 'if (req.body.name) user.name = req.body.name;');

fs.writeFileSync('backend/routes/userRoutes.js', content);

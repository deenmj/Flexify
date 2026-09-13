const fs = require('fs');

let content = fs.readFileSync('backend/controllers/vehicleController.js', 'utf8');

// Replace createVehicle subscription logic
content = content.replace(/\/\/ Auto-promote regular users to owner role[\s\S]*?\/\/ Subadmins and superadmins skip all subscription checks — free unlimited access\n/g, 
  `// Auto-promote regular users to owner role when they create their first listing
    if (owner.role === "user") {
      await User.findByIdAndUpdate(owner._id, {
        role: "owner",
        ownerType: "UNVERIFIED"
      });
      owner.role = "owner";
      owner.ownerType = "UNVERIFIED";
    }
`);

// Rewrite listVehicles active users checking
content = content.replace(/\/\/ Fetch owners who have active\/valid subscriptions[\s\S]*?filter\.owner = \{ \$in: allowedOwners \};\n/g, 
  `// Fetch owners who are active
    const activeUsers = await User.find({ status: "active" }).distinct("_id");
    const activeStaff = await Staff.find({ status: { $ne: "blocked" } }).distinct("_id");
    const allowedOwners = [...activeUsers, ...activeStaff];
    filter.owner = { $in: allowedOwners };
`);

// Rewrite listVehicles aggregation
content = content.replace(/\{\s*\$addFields: \{\s*tierBoost: \{\s*\$switch: \{[\s\S]*?\}\s*\}\s*\}\s*\},\s*\{ \$sort: \{ tierBoost: -1, \.\.\.sortCondition \} \},/g, '{ $sort: sortCondition },');
content = content.replace(/subscription: \"\$ownerInfo\.subscription\"/g, '');
fs.writeFileSync('backend/controllers/vehicleController.js', content);

const fs = require('fs');

let content = fs.readFileSync('flexify-app/src/components/AddVehicleSale.tsx', 'utf8');
content = content.replace(/<Form\.Item\s+name=\"commissionRate\"[\s\S]*?<\/Form\.Item>/g, '');
content = content.replace(/commissionRate: values\.commissionRate \|\| 0,/g, '');
content = content.replace(/<p className=\"text-sm text-gray-500 mt-2\">[\s\S]*?<\/p>/g, '');
fs.writeFileSync('flexify-app/src/components/AddVehicleSale.tsx', content);


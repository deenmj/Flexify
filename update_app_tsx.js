const fs = require('fs');
let content = fs.readFileSync('flexify-app/src/App.tsx', 'utf8');

content = content.replace(/import VerifyUser from '\.\/pages\/VerifyUser';\n/g, '');
content = content.replace(/<Route path=\"\/verify\" element=\{<ProtectedRoute><VerifyUser \/><\/ProtectedRoute>\} \/>\n/g, '');

fs.writeFileSync('flexify-app/src/App.tsx', content);

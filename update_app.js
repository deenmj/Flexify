const fs = require('fs');
let content = fs.readFileSync('flexify-app/src/App.tsx', 'utf8');
content = content.replace(/const VerifyUser = lazy\(\(\) => import\('\.\/pages\/VerifyUser'\)\);\n?/g, '');
content = content.replace(/<Route path="\/verify" element=\{<AppLayout><ProtectedRoute><VerifyUser \/><\/ProtectedRoute><\/AppLayout>\} \/>\n?/g, '');
fs.writeFileSync('flexify-app/src/App.tsx', content);

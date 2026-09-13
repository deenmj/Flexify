const fs = require('fs');
let content = fs.readFileSync('flexify-app/src/App.tsx', 'utf8');

content = content.replace(/const FAQ = lazy\(\(\) => import\('\.\/pages\/FAQ'\)\);\n/g, "const FAQ = lazy(() => import('./pages/FAQ'));\nconst Guides = lazy(() => import('./pages/Guides'));\n");
content = content.replace(/<Route path="\/faq" element=\{<AppLayout><FAQ \/><\/AppLayout>\} \/>\n/g, "<Route path=\"/faq\" element={<AppLayout><FAQ /></AppLayout>} />\n          <Route path=\"/guides\" element={<AppLayout><Guides /></AppLayout>} />\n");

fs.writeFileSync('flexify-app/src/App.tsx', content);

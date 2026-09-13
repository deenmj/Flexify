const fs = require('fs');
let content = fs.readFileSync('flexify-app/src/App.tsx', 'utf8');

content = content.replace(/const Guides = lazy\(\(\) => import\('\.\/pages\/Guides'\)\);\n/g, "const Guides = lazy(() => import('./pages/Guides'));\nconst TermsAndConditions = lazy(() => import('./pages/TermsAndConditions'));\nconst HowItWorks = lazy(() => import('./pages/HowItWorks'));\n");

content = content.replace(/<Route path="\/guides" element=\{<AppLayout><Guides \/><\/AppLayout>\} \/>\n/g, "<Route path=\"/guides\" element={<AppLayout><Guides /></AppLayout>} />\n          <Route path=\"/terms-and-conditions\" element={<AppLayout><TermsAndConditions /></AppLayout>} />\n          <Route path=\"/how-it-works\" element={<AppLayout><HowItWorks /></AppLayout>} />\n");

fs.writeFileSync('flexify-app/src/App.tsx', content);

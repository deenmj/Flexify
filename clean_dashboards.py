import os
import re

files_to_clean = [
    'flexify-app/src/pages/AdminDashboard.tsx',
    'flexify-app/src/pages/StaffDashboard.tsx',
    'flexify-app/src/pages/SuperAdminDashboard.tsx',
    'flexify-app/src/pages/Profile.tsx'
]

def clean_file(path):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Strip KYC, Subscription, Bank Tabs
    content = re.sub(r'<Tabs\.TabPane\s+tab="[^"]*(KYC|Bank|Commission|Payment|Subscription)[^"]*"\s+key="[^"]*">.*?</Tabs\.TabPane>', '', content, flags=re.DOTALL)
    
    # Also if they use items prop for tabs: items={tabItems}
    # It's harder with items. I will just do a general scrub of KYC blocks
    # Remove modals related to KYC
    content = re.sub(r'<Modal\s+title="KYC[^>]*>.*?</Modal>', '', content, flags=re.DOTALL)
    
    # Remove columns related to KYC
    content = re.sub(r'\{\s*title:\s*\'(?:KYC|Subscription|Payment|Commission)[^\}]+\},', '', content, flags=re.DOTALL | re.IGNORECASE)

    # Specific to Profile.tsx
    if 'Profile.tsx' in path:
        content = re.sub(r'\{user\?.isKycVerified \? \(.*?\) : \(.*?\)\}', '', content, flags=re.DOTALL)
        content = re.sub(r'\{!\(user\?.isKycVerified\) && \(.*?\)\}', '', content, flags=re.DOTALL)
        content = re.sub(r'<div className="doc-section.*?</form>\s*</div>\s*</div>', '', content, flags=re.DOTALL)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

for p in files_to_clean:
    clean_file(p)

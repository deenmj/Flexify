// flexify-app/src/utils/trafficTracker.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Get or initialize persistent anonymous visitor ID
 */
export const getVisitorId = (): string => {
  try {
    let vid = localStorage.getItem('fx_vid');
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem('fx_vid', vid);
    }
    return vid;
  } catch {
    return 'v_guest_' + Date.now();
  }
};

/**
 * Track current page view with Facebook Ads & UTM campaign detection
 */
export const trackPageView = async (path: string) => {
  // Do not track internal admin/staff dashboards
  if (
    path.startsWith('/admin') ||
    path.startsWith('/superadmin') ||
    path.startsWith('/staff')
  ) {
    return;
  }

  try {
    const visitorId = getVisitorId();
    const urlParams = new URLSearchParams(window.location.search);

    const fbclid = urlParams.get('fbclid');
    const utmSource = urlParams.get('utm_source') || '';
    const utmMedium = urlParams.get('utm_medium') || '';
    const utmCampaign = urlParams.get('utm_campaign') || '';

    // Cache first-touch campaign in sessionStorage so subsequent pages in same session retain attribution
    if (utmCampaign) sessionStorage.setItem('fx_campaign', utmCampaign);
    if (utmSource) sessionStorage.setItem('fx_source', utmSource);
    if (fbclid) sessionStorage.setItem('fx_fbclid', fbclid);

    const effectiveCampaign = utmCampaign || sessionStorage.getItem('fx_campaign') || '';
    const effectiveSource = utmSource || sessionStorage.getItem('fx_source') || '';
    const isFbClick = Boolean(fbclid || sessionStorage.getItem('fx_fbclid'));

    const referrer = document.referrer || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTablet = /iPad|Tablet/i.test(navigator.userAgent);
    const device = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

    // Source classification
    let source = 'Direct';
    let isFbAd = false;

    if (
      isFbClick ||
      effectiveSource.toLowerCase().includes('fb') ||
      effectiveSource.toLowerCase().includes('facebook') ||
      utmMedium.toLowerCase().includes('cpc') ||
      utmMedium.toLowerCase().includes('paid')
    ) {
      source = 'Facebook Ads';
      isFbAd = true;
    } else if (referrer.includes('facebook.com') || referrer.includes('fb.me')) {
      source = 'Facebook';
    } else if (referrer.includes('instagram.com') || effectiveSource.toLowerCase().includes('instagram')) {
      source = 'Instagram';
    } else if (referrer.includes('google.') || effectiveSource.toLowerCase().includes('google')) {
      source = 'Google';
    } else if (referrer) {
      try {
        source = new URL(referrer).hostname.replace(/^www\./, '');
      } catch {
        source = 'Referral';
      }
    }

    const payload = {
      visitorId,
      path,
      referrer,
      source,
      utmSource: effectiveSource,
      utmMedium,
      utmCampaign: effectiveCampaign,
      isFbAd,
      device,
    };

    // Non-blocking fire-and-forget
    fetch(`${API_BASE_URL}/traffic/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Ignore any tracking errors so user experience is never impacted
  }
};

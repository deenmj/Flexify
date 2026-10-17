import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../utils/trafficTracker';

/**
 * Global scroll-to-top and visitor traffic tracking on route change.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Override smooth scrolling to ensure instant jump to top
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    
    // Restore css smooth scroll behavior after a micro-task delay
    setTimeout(() => {
      document.documentElement.style.scrollBehavior = '';
    }, 0);

    // Track page view and marketing attribution (Facebook Ads, UTM tags, etc.)
    trackPageView(pathname);
  }, [pathname]);

  return null;
}

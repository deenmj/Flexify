import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Global scroll-to-top on route change.
 * Resets window scroll position to (0,0) whenever the pathname changes,
 * ensuring new pages always open at the top.
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
  }, [pathname]);

  return null;
}

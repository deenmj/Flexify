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
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

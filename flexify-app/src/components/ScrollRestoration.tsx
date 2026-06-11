import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export default function ScrollRestoration() {
  const { pathname, search } = useLocation();
  const navigationType = useNavigationType();
  const cacheKey = `scroll_${pathname}${search}`;

  useEffect(() => {
    // Prevent default browser scroll jumping so we can manage it smoothly
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const saveScrollPosition = () => {
      sessionStorage.setItem(cacheKey, window.scrollY.toString());
    };

    // Save position continuously on scroll
    window.addEventListener('scroll', saveScrollPosition);
    return () => {
      window.removeEventListener('scroll', saveScrollPosition);
    };
  }, [cacheKey]);

  useEffect(() => {
    // When the user goes BACK or FORWARD (POP navigation type)
    if (navigationType === 'POP') {
      const savedScrollY = sessionStorage.getItem(cacheKey);
      if (savedScrollY !== null) {
        // Wait a split second to ensure DOM/React elements are mounted
        const timer = setTimeout(() => {
          window.scrollTo({
            top: parseInt(savedScrollY, 10),
            behavior: 'instant' as any // Use instant to avoid awkward scrolling animations on back-nav
          });
        }, 30);
        return () => clearTimeout(timer);
      }
    } else {
      // For any new pages (PUSH or REPLACE), jump to the top immediately
      window.scrollTo(0, 0);
    }
  }, [pathname, search, navigationType, cacheKey]);

  return null;
}

import { useState, useEffect } from 'react';

/**
 * Custom hook to detect if the viewport is at or below a given breakpoint.
 * Uses `window.matchMedia` for efficient, event-driven detection (no resize spam).
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < breakpoint
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    
    // Set initial value
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobile(mql.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function PageTransitionHandler() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (window.scrollY > 200) window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

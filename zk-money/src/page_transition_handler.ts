import { useEffect } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

const PageTransition = ({ history }: RouteComponentProps) => {
  useEffect(() => {
    let prevPathname = history.location.pathname;
    const unlisten = history.listen(() => {
      if (prevPathname !== history.location.pathname && window.scrollY > 200) {
        window.scrollTo(0, 0);
      }
      prevPathname = history.location.pathname;
    });

    return () => {
      unlisten();
    };
  }, [history]);

  return null;
};

export const PageTransitionHandler = withRouter(PageTransition);

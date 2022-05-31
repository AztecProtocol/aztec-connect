import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from 'ui-components';
import { AppAction, MessageType } from 'app';
import { Template } from 'components';
import { Theme } from 'styles';
import { Home } from 'views/home';

const ERR_MSG = { type: MessageType.ERROR, message: 'Cannot reach rollup provider. Please try again later.' };

export function AppInitFailed() {
  const [showingError, setShowingError] = useState(false);
  const handleInteraction = () => setShowingError(true);
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname !== '/') handleInteraction();
  }, [pathname]);
  return (
    <Template theme={Theme.GRADIENT} systemMessage={showingError ? ERR_MSG : undefined}>
      <Navbar
        path={window.location.pathname}
        appAction={AppAction.NADA}
        theme={Theme.GRADIENT}
        isLoggedIn={false}
        onLogin={handleInteraction}
      />
      <Home
        onLogin={handleInteraction}
        onSignup={handleInteraction}
        isLoggedIn={false}
        homeState={{ supportStatus: 'supported' }}
      />
    </Template>
  );
}

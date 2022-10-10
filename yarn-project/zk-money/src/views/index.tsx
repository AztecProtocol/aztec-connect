import Cookie from 'js-cookie';
import { TopLevelContext } from '../alt-model/top_level_context/top_level_context.js';
import React, { useContext, useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Template } from '../components/index.js';
import { Config } from '../config.js';
import { PageTransitionHandler } from '../page_transition_handler.js';
import { AppView } from './app.js';
import { appPaths } from './views.js';
import { getCookiesToast } from './toasts/toast_configurations.js';
import { Theme } from '../styles/index.js';

export const getIsCookieAccepted = () => Cookie.get('accepted') === 'true';

function AppViewConnector({ config }: { config: Config }) {
  const { sdkObs, toastsObs } = useContext(TopLevelContext);
  const { pathname } = useLocation();
  const isCookieAccepted = getIsCookieAccepted();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isCookieAccepted) {
      toastsObs.addToast(getCookiesToast(toastsObs));
    }
  }, [isCookieAccepted, toastsObs]);

  if (appPaths.includes(pathname)) {
    return <AppView config={config} toastsObs={toastsObs} sdkObs={sdkObs} path={pathname} navigate={navigate} />;
  }
  return (
    <Template theme={Theme.GRADIENT} explorerUrl={config.explorerUrl}>
      <div>Not Found</div>
    </Template>
  );
}

interface ViewsProps {
  config: Config;
}

export const Views: React.FunctionComponent<ViewsProps> = ({ config }) => (
  <>
    <Routes>
      <Route path="/*" element={<AppViewConnector config={config} />} />
    </Routes>
    <PageTransitionHandler />
  </>
);

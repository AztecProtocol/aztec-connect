import Cookie from 'js-cookie';
import { TopLevelContext } from 'alt-model/top_level_context/top_level_context';
import React, { useContext, useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Template } from '../components';
import { getCookiesToast } from 'components/cookies_toast';
import { Config } from '../config';
import { PageTransitionHandler } from '../page_transition_handler';
import { Theme } from '../styles';
import { AppView } from './app';
import { appPaths } from './views';

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
  }, [isCookieAccepted]);

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

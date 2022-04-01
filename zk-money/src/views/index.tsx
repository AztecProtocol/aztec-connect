import { TopLevelContext } from 'alt-model/top_level_context/top_level_context';
import React, { useContext } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Template } from '../components';
import { Config } from '../config';
import { PageTransitionHandler } from '../page_transition_handler';
import { Theme } from '../styles';
import { AppView } from './app';
import { appPaths } from './views';

function AppViewConnector({ config }: { config: Config }) {
  const { sdkObs } = useContext(TopLevelContext);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (appPaths.includes(pathname)) {
    return <AppView config={config} sdkObs={sdkObs} path={pathname} navigate={navigate} />;
  }
  return (
    <Template theme={Theme.GRADIENT}>
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

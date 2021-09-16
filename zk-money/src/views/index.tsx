import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { Template } from '../components';
import { Config } from '../config';
import { PageTransitionHandler } from '../page_transition_handler';
import { Theme } from '../styles';
import { AboutBalance } from './about_balance';
import { AppView } from './app';
import { NotFound } from './not_found';
import { appPaths } from './views';

interface ViewsProps {
  config: Config;
}

export const Views: React.FunctionComponent<ViewsProps> = ({ config }) => (
  <>
    <Switch>
      <Route
        path={appPaths}
        exact
        children={({ match, ...props }) => <AppView {...props} config={config} match={match as any} />}
      />
      <Route path="/about_your_balance" exact>
        <Template theme={Theme.WHITE}>
          <AboutBalance />
        </Template>
      </Route>
      <Route>
        <Template theme={Theme.GRADIENT}>
          <NotFound />
        </Template>
      </Route>
    </Switch>
    <PageTransitionHandler />
  </>
);

import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { Template } from '../components';
import { Config } from '../config';
import { PageTransitionHandler } from '../page_transition_handler';
import { Theme } from '../styles';
import { AboutBalance } from './about_balance';
import { AppView } from './app';
import { NotFound } from './not_found';

interface ViewsProps {
  config: Config;
}

export const Views: React.FunctionComponent<ViewsProps> = ({ config }) => (
  <>
    <Switch>
      <Route path="/" exact>
        <AppView config={config} />
      </Route>
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

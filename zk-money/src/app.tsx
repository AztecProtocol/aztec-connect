import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { Template } from './components/template/';
import { NotFound } from './views/not_found';
import { Home } from './views/home';
import { PageTransitionHandler } from './page_transition_handler';

export const App = () => (
  <Template>
    <Switch>
      <Route path="/" exact>
        <Home />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
    <PageTransitionHandler />
  </Template>
);

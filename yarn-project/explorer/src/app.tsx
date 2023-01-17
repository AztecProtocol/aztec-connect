import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { Template } from './template/index.js';
import { Overview } from './overview/index.js';
import { BlockPage } from './block/index.js';
import { Tx } from './tx/index.js';
import { NotFound } from './not_found/index.js';
import { PageTransitionHandler } from './page_transition_handler.js';

export const App = () => (
  <Template>
    <Switch>
      <Route path="/block/:id" render={({ match }) => <BlockPage id={+match.params.id} />} />
      <Route path="/tx/:id" render={({ match }) => <Tx id={match.params.id} />} />
      <Route path="/" exact>
        <Overview />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
    <PageTransitionHandler />
  </Template>
);

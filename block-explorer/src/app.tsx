import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { Template } from './template';
import { Overview } from './overview';
import { Block } from './block';
import { Tx } from './tx';
import { NotFound } from './not_found';
import { PageTransitionHandler } from './page_transition_handler';

export const App = () => (
  <Template>
    <Switch>
      <Route path="/block/:id" render={({ match }) => <Block id={+match.params.id} />} />
      <Route path="/tx/:txId" render={({ match }) => <Tx txId={match.params.txId} />} />
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

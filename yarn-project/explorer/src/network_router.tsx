import { default as ApolloClient } from 'apollo-boost';
import React from 'react';
import { ApolloProvider } from 'react-apollo';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app.js';
import { Network } from './config.js';
import { NetworkContext } from './context.js';

export const NetworkRouter: React.FunctionComponent<{ network: Network }> = props => {
  const { baseUrl, endpoint } = props.network;
  const client = new ApolloClient({ uri: endpoint });

  return (
    <NetworkContext.Provider value={props.network}>
      <ApolloProvider client={client}>
        <BrowserRouter basename={baseUrl}>
          <App />
        </BrowserRouter>
      </ApolloProvider>
    </NetworkContext.Provider>
  );
};

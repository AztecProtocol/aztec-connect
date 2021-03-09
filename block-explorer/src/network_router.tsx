import ApolloClient from 'apollo-boost';
import React from 'react';
import { ApolloProvider } from 'react-apollo';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app';
import { Network, networks } from './config';
import { NetworkContext } from './context';

const getNetworkFromUrl = (): Network => {
  const network = window.location.pathname.split('/')[1];
  const baseUrl = `/${network || ''}`;
  return networks.find(n => n.baseUrl === baseUrl) || networks.find(n => n.baseUrl === '')!;
};

export const NetworkRouter: React.FunctionComponent = () => {
  const { name, baseUrl, endpoint } = getNetworkFromUrl();
  const client = new ApolloClient({ uri: endpoint });

  return (
    <NetworkContext.Provider value={name}>
      <ApolloProvider client={client}>
        <BrowserRouter basename={baseUrl}>
          <App />
        </BrowserRouter>
      </ApolloProvider>
    </NetworkContext.Provider>
  );
};

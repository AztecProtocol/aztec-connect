import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { CachePolicies, Provider as FetchProvider } from 'use-http';

import { App } from './app.js';
import { Network } from './config.js';
import { NetworkContext } from './context.js';

export const NetworkRouter: React.FunctionComponent<{ network: Network }> = props => {
  const { baseUrl, endpoint } = props.network;

  return (
    <NetworkContext.Provider value={props.network}>
      <FetchProvider url={endpoint} options={{ cachePolicy: CachePolicies.CACHE_AND_NETWORK }}>
        <BrowserRouter basename={baseUrl}>
          <App />
        </BrowserRouter>
      </FetchProvider>
    </NetworkContext.Provider>
  );
};

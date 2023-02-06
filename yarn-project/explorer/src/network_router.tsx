import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { CachePolicies, Provider as FetchProvider } from 'use-http';
import { ServerRollupProvider } from '@aztec/sdk';

import { App } from './app.js';
import { Network } from './config.js';
import { NetworkContext, RollupProviderContext } from './context.js';

export const NetworkRouter: React.FunctionComponent<{ network: Network }> = props => {
  const { baseUrl, endpoint } = props.network;

  const rollupProvider = new ServerRollupProvider(new URL(endpoint));

  return (
    <NetworkContext.Provider value={props.network}>
      <RollupProviderContext.Provider value={rollupProvider}>
        <FetchProvider url={endpoint} options={{ cachePolicy: CachePolicies.CACHE_AND_NETWORK }}>
          <BrowserRouter basename={baseUrl}>
            <App />
          </BrowserRouter>
        </FetchProvider>
      </RollupProviderContext.Provider>
    </NetworkContext.Provider>
  );
};

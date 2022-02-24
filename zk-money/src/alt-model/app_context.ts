import { AccountId, EthereumProvider } from '@aztec/sdk';
import { createContext, useContext } from 'react';
import { Provider, RollupService, UserSession } from '../app';
import { Database } from '../app/database';
import { KeyVault } from '../app/key_vault';
import { Network } from '../app/networks';
import { PriceFeedService } from '../app/price_feed_service';
import { Config } from '../config';

interface AppContextValue {
  config: Config;
  requiredNetwork: Network;
  provider?: Provider;
  accountId?: AccountId;
  alias?: string;
  keyVault?: KeyVault;
  db: Database;
  stableEthereumProvider?: EthereumProvider;
  rollupService?: RollupService;
  priceFeedService: PriceFeedService;
  userSession?: UserSession;
}

export const AppContext = createContext(
  // No default context value
  undefined as unknown as AppContextValue,
);

export function useApp() {
  return useContext(AppContext);
}

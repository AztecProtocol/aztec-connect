import { GrumpkinAddress } from '@aztec/sdk';
import { createContext, useContext } from 'react';
import { Provider, RollupService, UserSession } from '../app/index.js';
import { Database } from '../app/database/index.js';
import { KeyVault } from '../app/key_vault.js';
import { Network } from '../app/networks.js';
import { Config } from '../config.js';

interface AppContextValue {
  config: Config;
  requiredNetwork: Network;
  provider?: Provider;
  userId?: GrumpkinAddress;
  alias?: string;
  keyVault?: KeyVault;
  db: Database;
  rollupService?: RollupService;
  userSession?: UserSession;
}

export const AppContext = createContext(
  // No default context value
  undefined as unknown as AppContextValue,
);

export function useApp() {
  return useContext(AppContext);
}

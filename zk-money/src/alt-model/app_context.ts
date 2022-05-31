import { GrumpkinAddress } from '@aztec/sdk';
import { createContext, useContext } from 'react';
import { Provider, RollupService, UserSession } from '../app';
import { Database } from '../app/database';
import { KeyVault } from '../app/key_vault';
import { Network } from '../app/networks';
import { Config } from '../config';

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

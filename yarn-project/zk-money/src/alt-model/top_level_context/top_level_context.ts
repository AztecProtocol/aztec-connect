import { createContext } from 'react';
import type { Config } from '../../config.js';
import type { Provider } from '@ethersproject/providers';
import type { BridgeDataAdaptorsMethodCaches } from '../defi/bridge_data_adaptors/caches/bridge_data_adaptors_method_caches.js';
import type { RemoteStatusPoller } from './remote_status_poller.js';
import type { SdkObs } from './sdk_obs.js';
import type { DefiRecipe } from '../defi/types.js';
import type { AmountFactory } from '../assets/amount_factory.js';
import type { PriceFeedObsCache } from '../price_feeds/index.js';
import type { GasPricePoller } from '../gas/gas_price_obs.js';
import type { ToastsObs } from './toasts_obs.js';
import type { ChainLinkPollerCache } from '../../alt-model/price_feeds/chain_link_poller_cache.js';
import type { DefiPulishStatsPollerCache } from '../defi/defi_publish_stats_poller_cache.js';
import type { AccountStateManager } from '../account_state/account_state_manager.js';
import type { AliasManager } from '../account_state/alias_manager.js';
import type { RegistrationsRepo } from '../registrations_data/index.js';

export interface TopLevelContextValue {
  config: Config;
  stableEthereumProvider: Provider;
  sdkObs: SdkObs;
  accountStateManager: AccountStateManager;
  aliasManager: AliasManager;
  toastsObs: ToastsObs;
  walletInteractionToastsObs: ToastsObs;
  remoteStatusPoller: RemoteStatusPoller;
  registrationsRepo: RegistrationsRepo;
  amountFactory: AmountFactory;
  chainLinkPollerCache: ChainLinkPollerCache;
  priceFeedObsCache: PriceFeedObsCache;
  gasPricePoller: GasPricePoller;
  bridgeDataAdaptorsMethodCaches: BridgeDataAdaptorsMethodCaches;
  defiRecipes: DefiRecipe[];
  defiPulishStatsPollerCache: DefiPulishStatsPollerCache;
}

export const TopLevelContext = createContext(
  // No default value
  undefined as unknown as TopLevelContextValue,
);

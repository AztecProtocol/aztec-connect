import { useMemo } from 'react';
import { RollupProviderStatus } from '@aztec/sdk';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { createBridgeDataAdaptorsMethodCaches } from '../../alt-model/defi/bridge_data_adaptors/caches/bridge_data_adaptors_method_caches.js';
import { createDefiRecipes } from '../../alt-model/defi/recipes.js';
import { createPriceFeedObsCache } from '../../alt-model/price_feeds/index.js';
import { Config } from '../../config.js';
import { createSdkRemoteStatusPoller } from './remote_status_poller.js';
import { createSdkObs } from './sdk_obs.js';
import { TopLevelContext, TopLevelContextValue } from './top_level_context.js';
import { createGasPricePoller } from '../gas/gas_price_obs.js';
import { AmountFactory } from '../assets/amount_factory.js';
import { ToastsObs } from './toasts_obs.js';
import { createChainLinkPollerCache } from '../../alt-model/price_feeds/chain_link_poller_cache.js';
import { AccountStateManager } from '../account_state/account_state_manager.js';
import { AliasManager } from '../account_state/alias_manager.js';
import { createDefiPublishStatsPollerCache } from '../defi/defi_publish_stats_poller_cache.js';
import { RegistrationsRepo } from '../registrations_data/index.js';

function createTopLevelContextValue(
  config: Config,
  initialRollupProviderStatus: RollupProviderStatus,
): TopLevelContextValue {
  const stableEthereumProvider = new StaticJsonRpcProvider(config.ethereumHost);
  const sdkObs = createSdkObs(config);
  const accountStateManager = new AccountStateManager(sdkObs);
  const aliasManager = new AliasManager();
  accountStateManager.attemptRecoverSession(); // TODO: consider where this should live
  const toastsObs = new ToastsObs();
  const walletInteractionToastsObs = new ToastsObs();
  const remoteStatusPoller = createSdkRemoteStatusPoller(sdkObs, initialRollupProviderStatus);

  const registrationsRepo = new RegistrationsRepo(
    config.deployTag,
    initialRollupProviderStatus.blockchainStatus.assets,
    initialRollupProviderStatus.blockchainStatus.bridges,
  );
  const amountFactory = new AmountFactory(registrationsRepo.remoteAssets);
  const gasPricePoller = createGasPricePoller(stableEthereumProvider);
  const defiRecipes = createDefiRecipes(registrationsRepo);
  const bridgeDataAdaptorsMethodCaches = createBridgeDataAdaptorsMethodCaches(
    defiRecipes,
    stableEthereumProvider,
    initialRollupProviderStatus,
    config,
  );
  const chainLinkPollerCache = createChainLinkPollerCache(stableEthereumProvider);
  const priceFeedObsCache = createPriceFeedObsCache(
    stableEthereumProvider,
    chainLinkPollerCache,
    bridgeDataAdaptorsMethodCaches.underlyingAmountPollerCache,
    bridgeDataAdaptorsMethodCaches.expectedOutputPollerCache,
    bridgeDataAdaptorsMethodCaches.auxDataPollerCache,
  );
  const defiPulishStatsPollerCache = createDefiPublishStatsPollerCache(sdkObs);

  return {
    config,
    stableEthereumProvider,
    sdkObs,
    accountStateManager,
    aliasManager,
    toastsObs,
    walletInteractionToastsObs,
    remoteStatusPoller,
    registrationsRepo,
    amountFactory,
    chainLinkPollerCache,
    priceFeedObsCache,
    gasPricePoller,
    bridgeDataAdaptorsMethodCaches,
    defiRecipes,
    defiPulishStatsPollerCache,
  };
}

interface TopLevelContextProviderProps {
  children: React.ReactNode;
  config: Config;
  initialRollupProviderStatus: RollupProviderStatus;
}

export function TopLevelContextProvider({
  config,
  initialRollupProviderStatus,
  children,
}: TopLevelContextProviderProps) {
  const value = useMemo(
    () => createTopLevelContextValue(config, initialRollupProviderStatus),
    [config, initialRollupProviderStatus],
  );
  return <TopLevelContext.Provider value={value}>{children}</TopLevelContext.Provider>;
}

import { isIOS } from './device_support';

export interface Config {
  rollupProviderUrl: string;
  graphqlEndpoint: string;
  explorerUrl: string;
  infuraId: string;
  network: string;
  ethereumHost: string;
  priceFeedContractAddresses: string[];
  txAmountLimits: bigint[];
  withdrawSafeAmounts: bigint[][];
  sessionTimeout: number;
  debug: boolean;
  saveProvingKey: boolean;
  maxAvailableAssetId: number;
}

interface ConfigVars {
  rollupProviderUrl: string;
  graphqlEndpoint: string;
  explorerUrl: string;
  infuraId: string;
  network: string;
  ethereumHost: string;
  priceFeedContractAddress0: string;
  priceFeedContractAddress1: string;
  txAmountLimits: string;
  withdrawSafeAmounts: string;
  sessionTimeout: string;
  maxAvailableAssetId: string;
  debug: boolean;
}

const removeEmptyValues = (vars: ConfigVars): Partial<ConfigVars> => {
  const nonEmptyVars = { ...vars };
  (Object.keys(vars) as (keyof ConfigVars)[]).forEach(key => {
    if (!vars[key]) {
      delete nonEmptyVars[key];
    }
  });
  return nonEmptyVars;
};

const fromLocalStorage = (): ConfigVars => ({
  rollupProviderUrl: localStorage.getItem('zm_rollupProviderUrl') || '',
  graphqlEndpoint: localStorage.getItem('zm_graphqlEndpoint') || '',
  explorerUrl: localStorage.getItem('zm_explorerUrl') || '',
  infuraId: localStorage.getItem('zm_infuraId') || '',
  network: localStorage.getItem('zm_network') || '',
  ethereumHost: localStorage.getItem('zm_ethereumHost') || '',
  priceFeedContractAddress0: localStorage.getItem('zm_priceFeedContractAddress0') || '',
  priceFeedContractAddress1: localStorage.getItem('zm_priceFeedContractAddress1') || '',
  txAmountLimits: localStorage.getItem('zm_txAmountLimit') || '',
  withdrawSafeAmounts: localStorage.getItem('zm_withdrawSafeAmounts') || '',
  sessionTimeout: localStorage.getItem('zm_sessionTimeout') || '',
  maxAvailableAssetId: localStorage.getItem('zm_maxAvailableAssetId') || '',
  debug: !!localStorage.getItem('zm_debug'),
});

const fromEnvVars = (): ConfigVars => ({
  rollupProviderUrl: process.env.REACT_APP_ROLLUP_PROVIDER_URL || '',
  graphqlEndpoint: process.env.REACT_APP_GRAPHQL_ENDPOINT || '',
  explorerUrl: process.env.REACT_APP_EXPLORER_URL || '',
  infuraId: process.env.REACT_APP_INFURA_ID || '',
  network: process.env.REACT_APP_NETWORK || '',
  ethereumHost: process.env.REACT_APP_ETHEREUM_HOST || '',
  priceFeedContractAddress0: process.env.REACT_APP_PRICE_FEED_CONTRACT_ADDRESS_0 || '',
  priceFeedContractAddress1: process.env.REACT_APP_PRICE_FEED_CONTRACT_ADDRESS_1 || '',
  txAmountLimits: process.env.REACT_APP_TX_AMOUNT_LIMIT || '',
  withdrawSafeAmounts: process.env.REACT_APP_WITHDRAW_SAFE_AMOUNT || '',
  sessionTimeout: process.env.REACT_APP_SESSION_TIMEOUT || '',
  maxAvailableAssetId: process.env.REACT_APP_MAX_AVAILABLE_ASSET_ID || '',
  debug: !!process.env.REACT_APP_DEBUG,
});

const productionConfig: ConfigVars = {
  rollupProviderUrl: 'https://api.aztec.network/falafel-mainnet',
  graphqlEndpoint: 'https://api.aztec.network/falafel-mainnet/graphql',
  explorerUrl: 'https://explorer.aztec.network',
  infuraId: '6a04b7c89c5b421faefde663f787aa35',
  network: 'mainnet',
  ethereumHost: '',
  priceFeedContractAddress0: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // ETH/USD
  priceFeedContractAddress1: '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9', // DAI/USD
  txAmountLimits: JSON.stringify([
    '1'.padEnd(19, '0'), // 10 ** 18
    '2'.padEnd(22, '0'), // 2000 * 10 ** 18
  ]),
  withdrawSafeAmounts: JSON.stringify([
    [
      '1'.padEnd(18, '0'), // 0.1 zkETH
      '1'.padEnd(19, '0'), // 1 zkETH
    ],
    [
      '2'.padEnd(21, '0'), // 200 zkDAI
      '2'.padEnd(22, '0'), // 2000 zkDAI
    ],
  ]),
  sessionTimeout: '30', // days
  maxAvailableAssetId: '1',
  debug: true,
};

const developmentConfig: ConfigVars = {
  ...productionConfig,
  rollupProviderUrl: `${window.location.protocol}//${window.location.hostname}:8081`,
  graphqlEndpoint: `${window.location.protocol}//${window.location.hostname}:8081/graphql`,
  explorerUrl: `${window.location.protocol}//${window.location.hostname}:3000/ganache`,
  network: 'ganache',
  ethereumHost: 'http://localhost:8545',
  debug: true,
};

export const getConfig = (): Config => {
  const { NODE_ENV } = process.env;
  const defaultConfig = NODE_ENV === 'development' ? developmentConfig : productionConfig;
  const {
    rollupProviderUrl,
    graphqlEndpoint,
    explorerUrl,
    infuraId,
    network,
    ethereumHost,
    priceFeedContractAddress0,
    priceFeedContractAddress1,
    txAmountLimits,
    withdrawSafeAmounts,
    sessionTimeout,
    maxAvailableAssetId,
    debug,
  } = { ...defaultConfig, ...removeEmptyValues(fromEnvVars()), ...removeEmptyValues(fromLocalStorage()) };

  return {
    rollupProviderUrl,
    graphqlEndpoint,
    explorerUrl,
    infuraId,
    network,
    ethereumHost,
    priceFeedContractAddresses: [priceFeedContractAddress0, priceFeedContractAddress1],
    txAmountLimits: JSON.parse(txAmountLimits).map((amount: string) => BigInt(amount)),
    withdrawSafeAmounts: JSON.parse(withdrawSafeAmounts).map((amounts: string[]) =>
      amounts.map((a: string) => BigInt(a)),
    ),
    sessionTimeout: +(sessionTimeout || 1),
    maxAvailableAssetId: +maxAvailableAssetId,
    debug,
    saveProvingKey: !isIOS(),
  };
};

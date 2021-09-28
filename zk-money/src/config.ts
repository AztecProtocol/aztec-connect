import { toBaseUnits } from './app/units';
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
  priceFeedContractAddress2: string;
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
  priceFeedContractAddress2: localStorage.getItem('zm_priceFeedContractAddress2') || '',
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
  priceFeedContractAddress2: process.env.REACT_APP_PRICE_FEED_CONTRACT_ADDRESS_2 || '',
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
  priceFeedContractAddress2: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c', // BTC/USD
  txAmountLimits: JSON.stringify([
    `${toBaseUnits('30', 18)}`, // 30 ETH
    `${toBaseUnits('100000', 18)}`, // 100000 DAI
    `${toBaseUnits('2', 8)}`, // 2 renBTC
  ]),
  withdrawSafeAmounts: JSON.stringify([
    [
      `${toBaseUnits('0.1', 18)}`, // 0.1 zkETH
      `${toBaseUnits('1', 18)}`, // 1 zkETH
      `${toBaseUnits('10', 18)}`, // 10 zkETH
      `${toBaseUnits('30', 18)}`, // 30 zkETH
    ],
    [
      `${toBaseUnits('200', 18)}`, // 200 zkDAI
      `${toBaseUnits('2000', 18)}`, // 2000 zkDAI
      `${toBaseUnits('20000', 18)}`, // 20000 zkDAI
      `${toBaseUnits('100000', 18)}`, // 100000 zkDAI
    ],
    [
      `${toBaseUnits('0.01', 8)}`, // 0.01 zkrenBTC
      `${toBaseUnits('0.1', 8)}`, // 0.1 zkrenBTC
      `${toBaseUnits('1', 8)}`, // 1 zkrenBTC
      `${toBaseUnits('2', 8)}`, // 2 zkrenBTC
    ],
  ]),
  sessionTimeout: '30', // days
  maxAvailableAssetId: '2',
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
  const defaultConfig = process.env.NODE_ENV === 'development' ? developmentConfig : productionConfig;
  const {
    rollupProviderUrl,
    graphqlEndpoint,
    explorerUrl,
    infuraId,
    network,
    ethereumHost,
    priceFeedContractAddress0,
    priceFeedContractAddress1,
    priceFeedContractAddress2,
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
    priceFeedContractAddresses: [priceFeedContractAddress0, priceFeedContractAddress1, priceFeedContractAddress2],
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

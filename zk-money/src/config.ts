export interface Config {
  rollupProviderUrl: string;
  graphqlEndpoint: string;
  explorerUrl: string;
  infuraId: string;
  network: string;
  ethereumHost: string;
  priceFeedContractAddresses: string[];
  txAmountLimit: bigint;
  sessionTimeout: number;
  debug: boolean;
}

interface ConfigVars {
  rollupProviderUrl: string;
  graphqlEndpoint: string;
  explorerUrl: string;
  infuraId: string;
  network: string;
  ethereumHost: string;
  priceFeedContractAddress0: string;
  txAmountLimit: string;
  sessionTimeout: string;
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
  txAmountLimit: localStorage.getItem('zm_txAmountLimit') || '',
  sessionTimeout: localStorage.getItem('zm_sessionTimeout') || '',
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
  txAmountLimit: process.env.REACT_APP_TX_AMOUNT_LIMIT || '',
  sessionTimeout: process.env.REACT_APP_SESSION_TIMEOUT || '',
  debug: !!process.env.REACT_APP_DEBUG,
});

const productionConfig: ConfigVars = {
  rollupProviderUrl: 'https://api.aztec.network/falafel-mainnet',
  graphqlEndpoint: 'https://api.aztec.network/falafel-mainnet/graphql',
  explorerUrl: 'https://explorer.aztec.network',
  infuraId: '6a04b7c89c5b421faefde663f787aa35',
  network: 'mainnet',
  ethereumHost: '',
  priceFeedContractAddress0: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  txAmountLimit: '1'.padEnd(19, '0'), // 10 ** 18
  sessionTimeout: '30', // days
  debug: false,
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
    txAmountLimit,
    sessionTimeout,
    debug,
  } = { ...defaultConfig, ...removeEmptyValues(fromEnvVars()), ...removeEmptyValues(fromLocalStorage()) };

  return {
    rollupProviderUrl,
    graphqlEndpoint,
    explorerUrl,
    infuraId,
    network,
    ethereumHost,
    priceFeedContractAddresses: [priceFeedContractAddress0],
    txAmountLimit: BigInt(txAmountLimit || 0),
    sessionTimeout: +(sessionTimeout || 1),
    debug,
  };
};

export interface Config {
  rollupProviderUrl: string;
  graphqlEndpoint: string;
  explorerUrl: string;
  infuraId: string;
  network: string;
  ethereumHost?: string;
  txAmountLimit: bigint;
  sessionTimeout: number;
  debug: boolean;
}

export const getConfig = (): Config => {
  const {
    NODE_ENV,
    REACT_APP_DEV_SERVER,
    REACT_APP_NETWORK,
    REACT_APP_INFURA_ID,
    REACT_APP_ETHEREUM_HOST,
    REACT_APP_TX_AMOUNT_LIMIT,
    REACT_APP_SESSION_TIMEOUT,
    REACT_APP_ENABLE_DEBUG,
  } = process.env;

  const useRemoteServer = NODE_ENV !== 'development' || REACT_APP_DEV_SERVER === 'REMOTE';

  const rollupProviderUrl = useRemoteServer
    ? 'https://api.aztec.network/falafel'
    : `${window.location.protocol}//${window.location.hostname}:8081`;

  const graphqlEndpoint = useRemoteServer
    ? 'https://api.aztec.network/falafel/graphql'
    : `${window.location.protocol}//${window.location.hostname}:8081/graphql`;

  const explorerUrl = useRemoteServer
    ? 'https://explorer.aztec.network'
    : `${window.location.protocol}//${window.location.hostname}:3000`;

  const infuraId = REACT_APP_INFURA_ID || '6a04b7c89c5b421faefde663f787aa35';

  const network = REACT_APP_NETWORK || (useRemoteServer ? 'goerli' : 'ganache');

  const ethereumHost = REACT_APP_ETHEREUM_HOST || (!useRemoteServer ? 'http://localhost:8545' : undefined);

  const txAmountLimit = BigInt(REACT_APP_TX_AMOUNT_LIMIT || '1'.padEnd(19, '0'));

  const sessionTimeout = +(REACT_APP_SESSION_TIMEOUT || 30); // days

  const debug = NODE_ENV === 'development' || !!REACT_APP_ENABLE_DEBUG;

  return {
    rollupProviderUrl,
    graphqlEndpoint,
    explorerUrl,
    infuraId,
    network,
    ethereumHost,
    txAmountLimit,
    sessionTimeout,
    debug,
  };
};

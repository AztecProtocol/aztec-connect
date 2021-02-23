export interface Config {
  rollupProviderUrl: string;
  graphqlEndpoint: string;
  explorerUrl: string;
  infuraId?: string;
  network: string;
  ethereumHost?: string;
  depositLimit: bigint;
  sessionTimeout: number;
  debug: boolean;
}

export const getConfig = (): Config => {
  const {
    NODE_ENV,
    REACT_APP_INFURA_ID,
    REACT_APP_NETWORK,
    REACT_APP_ETHEREUM_HOST,
    REACT_APP_DEPOSIT_LIMIT,
    REACT_APP_SESSION_TIMEOUT,
    REACT_APP_ENABLE_DEBUG,
  } = process.env;

  const rollupProviderUrl =
    NODE_ENV === 'development'
      ? `${window.location.protocol}//${window.location.hostname}:8081`
      : 'https://api.aztec.network/falafel';

  const graphqlEndpoint =
    NODE_ENV === 'development'
      ? `${window.location.protocol}//${window.location.hostname}:8081/graphql`
      : 'https://api.aztec.network/falafel/graphql';

  const explorerUrl =
    NODE_ENV === 'development'
      ? `${window.location.protocol}//${window.location.hostname}:3000`
      : 'https://explorer.aztec.network';

  const infuraId = NODE_ENV === 'development' ? 'b3320e6dfb2944d69e7b160be3473874' : '6a04b7c89c5b421faefde663f787aa35';

  const network = REACT_APP_NETWORK || (NODE_ENV === 'development' ? 'ganache' : 'goerli');

  const ethereumHost = REACT_APP_ETHEREUM_HOST || (NODE_ENV === 'development' ? 'http://localhost:8545' : undefined);

  const depositLimit = BigInt(REACT_APP_DEPOSIT_LIMIT || '1'.padEnd(19, '0'));

  const sessionTimeout = +(REACT_APP_SESSION_TIMEOUT || 7); // days

  const debug = NODE_ENV === 'development' || !!REACT_APP_ENABLE_DEBUG;

  return {
    rollupProviderUrl,
    graphqlEndpoint,
    explorerUrl,
    infuraId,
    network,
    ethereumHost,
    depositLimit,
    sessionTimeout,
    debug,
  };
};

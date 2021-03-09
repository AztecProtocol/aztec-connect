export interface Network {
  name: string;
  baseUrl: string;
  endpoint: string;
  etherscanUrl: string;
}

export const networks: Network[] = [
  // {
  //   name: 'mainnet',
  //   baseUrl: '',
  //   endpoint: 'https://api.aztec.network/falafel/graphql',
  //   etherscanUrl: 'https://etherscan.io',
  // },
  {
    name: 'goerli',
    // baseUrl: '/goerli',
    baseUrl: '',
    endpoint: 'https://api.aztec.network/falafel/graphql',
    etherscanUrl: 'https://goerli.etherscan.io',
  },
  {
    name: 'ganache',
    baseUrl: '/ganache',
    endpoint: `${window.location.protocol}//${window.location.hostname}:8081/graphql`,
    etherscanUrl: '',
  },
];

export const POLL_INTERVAL = 5000;

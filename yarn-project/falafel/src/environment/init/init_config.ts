const initConfig = {
  '1': {
    accountsData: './data/mainnet/accounts',
  },
  '677868' /* 0xa57ec */: {
    accountsData: './data/mainnet_fork/accounts',
  },
  '3567' /* 0xdef */: {
    accountsData: './data/mainnet_fork/accounts',
  },
  default: {
    accountsData: './data/default/accounts',
  },
  /* Empty defaults.
  default: {
    accountsData: '',
  }, */
} as any;

export function getInitData(chainId: number) {
  return initConfig[chainId] ?? initConfig['default'];
}

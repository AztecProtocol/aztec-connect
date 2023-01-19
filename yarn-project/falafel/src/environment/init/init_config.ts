import { configurator } from '../../configurator.js';

const dataDir = configurator.getDataDir();

const initConfig = {
  '1': {
    accountsData: `${dataDir}/mainnet/accounts`,
  },
  '677868' /* 0xa57ec */: {
    accountsData: `${dataDir}/mainnet_fork/accounts`,
  },
  '359070' /* 0x57a9e */: {
    accountsData: `${dataDir}/mainnet_fork/accounts`,
  },
  '3567' /* 0xdef */: {
    accountsData: `${dataDir}/mainnet_fork/accounts`,
  },
  default: {
    accountsData: `${dataDir}/default/accounts`,
  },
  /* Empty defaults.
  default: {
    accountsData: '',
  }, */
} as any;

export function getInitData(chainId: number) {
  return initConfig[chainId] ?? initConfig['default'];
}

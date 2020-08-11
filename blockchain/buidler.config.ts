import { usePlugin } from '@nomiclabs/buidler/config';
import dotenv from 'dotenv';
dotenv.config();

usePlugin('@nomiclabs/buidler-waffle');

export default {
  solc: {
    version: '0.6.10',
    evmVersion: 'istanbul',
    optimizer: { enabled: true, runs: 200 },
  },
  networks: {
    ganache: {
      url: `http://${process.env.GANACHE_HOST || 'localhost'}:8545`,
    },
    buidlerevm: {
      blockGasLimit: 10000000,
      gas: 8000000,
      hardfork: 'istanbul',
    },
  },
  paths: {
    artifacts: './src/artifacts',
  },
};

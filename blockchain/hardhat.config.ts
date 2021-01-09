import { HardhatUserConfig } from 'hardhat/config';
import dotenv from 'dotenv';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: '0.6.10',
    settings: {
      evmVersion: 'istanbul',
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    ganache: {
      url: `http://${process.env.GANACHE_HOST || 'localhost'}:8545`,
    },
    hardhat: {
      blockGasLimit: 10000000,
      gas: 8000000,
      hardfork: 'istanbul',
    },
  },
  paths: {
    artifacts: './src/artifacts',
  },
};

export default config;

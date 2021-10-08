import { HardhatUserConfig } from 'hardhat/config';
import dotenv from 'dotenv';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';

dotenv.config();

const config: any = {
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
    // mainnet: {
    //   url: process.env.ETHEREUM_HOST,
    // },
    hardhat: {
      blockGasLimit: 10000000,
      gasPrice: 10,
      hardfork: 'istanbul',
    },
  },
  paths: {
    artifacts: './src/artifacts',
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;

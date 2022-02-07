import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import '@openzeppelin/hardhat-upgrades';

const config = {
  solidity: {
    version: '0.8.4',
    settings: {
      evmVersion: 'berlin',
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    ganache: {
      url: `http://${process.env.GANACHE_HOST || 'localhost'}:8545`,
    },
    hardhat: {
      blockGasLimit: 15000000,
      gasPrice: 10,
      hardfork: 'berlin',
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

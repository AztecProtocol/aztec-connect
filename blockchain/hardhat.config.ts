import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-contract-sizer'

const config = {
  solidity: {
    version: '0.8.10',
    settings: {
      evmVersion: 'london',
      optimizer: { enabled: true, runs: 2000 },
    },
  },
  networks: {
    ganache: {
      url: `http://${process.env.GANACHE_HOST || 'localhost'}:8545`,
    },
    goerli: {
      url: 'https://goerli.infura.io/v3/6a04b7c89c5b421faefde663f787aa35',
    },
    hardhat: {
      forking: {
        url: "https://mainnet.infura.io/v3/6a04b7c89c5b421faefde663f787aa35",
        blockNumber: 14728000,
      }
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

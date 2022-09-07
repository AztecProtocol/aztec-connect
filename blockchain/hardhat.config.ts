import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-contract-sizer';
import 'hardhat-gas-reporter';
// import 'solidity-coverage'; // Include to run coverage. Not passed to CI due to dependencies pull

const config = {
  gasRepoter: {
    enabled: true,
  },
  solidity: {
    version: '0.8.10',
    settings: {
      evmVersion: 'london',
      optimizer: { enabled: true, runs: 5000 },
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
      allowUnlimitedContractSize: true,
      forking: {
        url: 'https://mainnet.infura.io/v3/6a04b7c89c5b421faefde663f787aa35',
        blockNumber: 14728000,
      },
    },
  },
  paths: {
    artifacts: './src/artifacts',
    tests: './src/contracts',
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  mocha: {
    timeout: 1000000,
  },
};

export default config;

import { EthAddress } from 'barretenberg/address';
import { WorldStateDb } from 'barretenberg/world_state_db';
import { EthereumBlockchain, EthersAdapter } from 'blockchain';
import { ethers } from 'ethers';
import http from 'http';
import 'reflect-metadata';
import { appFactory } from './app';
import Server from './server';
import 'log-timestamp';
import { emptyDir, mkdirp, pathExists, readJson, writeJson } from 'fs-extra';

const {
  PORT = '8082',
  ROLLUP_CONTRACT_ADDRESS,
  ETHEREUM_HOST = 'http://localhost:8545',
  API_PREFIX = '',
  INFURA_API_KEY,
  NETWORK,
  MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW,
} = process.env;

function getEthereumBlockchainConfig() {
  const minConfirmationEHW = MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW ? +MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW : undefined;
  if (INFURA_API_KEY && NETWORK && ROLLUP_CONTRACT_ADDRESS) {
    console.log(`Infura network: ${NETWORK}`);
    console.log(`Rollup contract address: ${ROLLUP_CONTRACT_ADDRESS}`);
    const provider = new EthersAdapter(new ethers.providers.InfuraProvider(NETWORK, INFURA_API_KEY));
    const ethConfig = { minConfirmationEHW };
    return { provider, ethConfig };
  } else if (ETHEREUM_HOST && ROLLUP_CONTRACT_ADDRESS) {
    console.log(`Ethereum host: ${ETHEREUM_HOST}`);
    console.log(`Rollup contract address: ${ROLLUP_CONTRACT_ADDRESS}`);
    const provider = new EthersAdapter(new ethers.providers.JsonRpcProvider(ETHEREUM_HOST));
    const ethConfig = { minConfirmationEHW };
    return { provider, ethConfig };
  }
  throw new Error('Config incorrect');
}

async function checkState() {
  if (await pathExists('./data/state')) {
    const { rollupContractAddress: storedRollupAddress } = await readJson('./data/state');

    // Erase all data if rollup contract changes.
    if (storedRollupAddress !== ROLLUP_CONTRACT_ADDRESS) {
      console.log(`Rollup contract changed, erasing data: ${storedRollupAddress} -> ${ROLLUP_CONTRACT_ADDRESS}`);
      await emptyDir('./data');
    }
  }

  await mkdirp('./data');
  await writeJson('./data/state', { rollupContractAddress: ROLLUP_CONTRACT_ADDRESS });
}

async function main() {
  await checkState();

  const shutdown = async () => process.exit(0);
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  const worldStateDb = new WorldStateDb();
  const { provider, ethConfig } = getEthereumBlockchainConfig();

  if (!ethConfig) {
    throw new Error('No ethereum config.');
  }

  const ethereumBlockchain = await EthereumBlockchain.new(
    ethConfig,
    EthAddress.fromString(ROLLUP_CONTRACT_ADDRESS!),
    provider,
  );

  const server = new Server(worldStateDb, ethereumBlockchain);
  await server.start();

  const app = appFactory(server, API_PREFIX);

  const httpServer = http.createServer(app.callback());
  httpServer.listen(PORT);
  console.log(`Server listening on port ${PORT}.`);
}

main().catch(console.log);

import { EthAddress } from '@aztec/barretenberg/address';
import { WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { EthereumBlockchain, JsonRpcProvider } from '@aztec/blockchain';
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
  MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW,
} = process.env;

function getEthereumBlockchainConfig() {
  const minConfirmationEHW = MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW ? +MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW : undefined;
  if (ETHEREUM_HOST && ROLLUP_CONTRACT_ADDRESS) {
    console.log(`Ethereum host: ${ETHEREUM_HOST}`);
    console.log(`Rollup contract address: ${ROLLUP_CONTRACT_ADDRESS}`);
    const provider = new JsonRpcProvider(ETHEREUM_HOST);
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
    [],
    provider,
  );

  const server = new Server(worldStateDb, ethereumBlockchain);
  const app = appFactory(server, API_PREFIX);

  const httpServer = http.createServer(app.callback());
  httpServer.listen(PORT);
  console.log(`Server listening on port ${PORT}.`);

  await server.start();
}

main().catch(console.log);

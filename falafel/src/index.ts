import { WorldStateDb } from 'barretenberg/world_state_db';
import { EthereumBlockchain } from 'blockchain';
import { EthAddress } from 'barretenberg/address';
import dotenv from 'dotenv';
import { ethers, Signer } from 'ethers';
import http from 'http';
import moment from 'moment';
import 'reflect-metadata';
import 'source-map-support/register';
import { createConnection } from 'typeorm';
import { appFactory } from './app';
import { LocalBlockchain } from './blockchain/local_blockchain';
import { RollupDb } from './rollup_db';
import { Server, ServerConfig } from './server';
import 'log-timestamp';
import { randomBytes } from 'crypto';
import { emptyDir, mkdirp, pathExists, readJson, writeJson } from 'fs-extra';

dotenv.config();

const {
  PORT = '8081',
  ROLLUP_CONTRACT_ADDRESS,
  ETHEREUM_HOST,
  INFURA_API_KEY,
  NETWORK,
  PRIVATE_KEY,
  ROLLUP_SIZE = '2',
  MAX_ROLLUP_WAIT_TIME = '10',
  MIN_ROLLUP_INTERVAL = '0',
  MIN_CONFIRMATION = '1',
  MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW = '12',
  LOCAL_BLOCKCHAIN_INIT_SIZE = '0',
  API_PREFIX = '',
  GAS_LIMIT = '',
  SERVER_AUTH_TOKEN = randomBytes(32).toString('hex'),
} = process.env;

async function getEthereumBlockchainConfig() {
  const gasLimit = GAS_LIMIT ? +GAS_LIMIT : undefined;
  const minConfirmation = +MIN_CONFIRMATION;
  const minConfirmationEHW = +MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW;
  if (INFURA_API_KEY && NETWORK && PRIVATE_KEY && ROLLUP_CONTRACT_ADDRESS) {
    console.log(`Infura network: ${NETWORK}`);
    console.log(`Rollup contract address: ${ROLLUP_CONTRACT_ADDRESS}`);
    const provider = new ethers.providers.InfuraProvider(NETWORK, INFURA_API_KEY);
    return {
      provider,
      signer: new ethers.Wallet(PRIVATE_KEY, provider) as Signer,
      networkOrHost: NETWORK,
      gasLimit,
      minConfirmation,
      minConfirmationEHW,
    };
  } else if (ETHEREUM_HOST && ROLLUP_CONTRACT_ADDRESS) {
    console.log(`Ethereum host: ${ETHEREUM_HOST}`);
    console.log(`Rollup contract address: ${ROLLUP_CONTRACT_ADDRESS}`);
    const provider = new ethers.providers.JsonRpcProvider(ETHEREUM_HOST);
    const config = { provider, networkOrHost: ETHEREUM_HOST, gasLimit, minConfirmation, minConfirmationEHW };
    if (PRIVATE_KEY) {
      return { ...config, signer: new ethers.Wallet(PRIVATE_KEY, provider) as Signer };
    } else if ((await provider.listAccounts()).length) {
      return { ...config, signer: provider.getSigner(0) };
    } else {
      return config;
    }
  }
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

  const serverConfig: ServerConfig = {
    rollupSize: +ROLLUP_SIZE,
    maxRollupWaitTime: moment.duration(+MAX_ROLLUP_WAIT_TIME, 's'),
    minRollupInterval: moment.duration(+MIN_ROLLUP_INTERVAL, 's'),
  };

  const connection = await createConnection();
  const ethConfig = await getEthereumBlockchainConfig();
  const blockchain = ethConfig
    ? await EthereumBlockchain.new(ethConfig, EthAddress.fromString(ROLLUP_CONTRACT_ADDRESS!))
    : new LocalBlockchain(connection, serverConfig.rollupSize, +LOCAL_BLOCKCHAIN_INIT_SIZE);
  const rollupDb = new RollupDb(connection);

  const worldStateDb = new WorldStateDb();
  const server = new Server(serverConfig, blockchain, rollupDb, worldStateDb);

  const shutdown = async () => {
    server.stop();
    await connection.close();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  await server.start();

  const serverStatus = await server.getStatus();
  const app = appFactory(server, API_PREFIX, connection, worldStateDb, serverStatus, SERVER_AUTH_TOKEN);

  const httpServer = http.createServer(app.callback());
  httpServer.listen(PORT);
  console.log(`Server listening on port ${PORT}.`);
}

main().catch(err => {
  console.log(err);
  process.exit(1);
});

import { WorldStateDb } from 'barretenberg/world_state_db';
import { EthereumBlockchain, EthereumBlockchainConfig } from 'blockchain';
import { EthAddress } from 'barretenberg/address';
import dotenv from 'dotenv';
import { ethers, Signer } from 'ethers';
import http from 'http';
import moment from 'moment';
import 'reflect-metadata';
import 'source-map-support/register';
import { Connection, createConnection } from 'typeorm';
import { appFactory } from './app';
import { LocalBlockchain } from './blockchain/local_blockchain';
import { PersistentEthereumBlockchain } from './blockchain/persistent_ethereum_blockchain';
import { RollupDb } from './rollup_db';
import { Server, ServerConfig } from './server';
import 'log-timestamp';

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
  LOCAL_BLOCKCHAIN_INIT_SIZE = '0',
  API_PREFIX = '',
} = process.env;

function getEthereumBlockchainConfig() {
  if (INFURA_API_KEY && NETWORK && PRIVATE_KEY && ROLLUP_CONTRACT_ADDRESS) {
    console.log(`Infura network: ${NETWORK}`);
    console.log(`Rollup contract address: ${ROLLUP_CONTRACT_ADDRESS}`);
    const provider = new ethers.providers.InfuraProvider(NETWORK, INFURA_API_KEY);
    return { provider, signer: new ethers.Wallet(PRIVATE_KEY, provider) as Signer, networkOrHost: NETWORK };
  } else if (ETHEREUM_HOST && ROLLUP_CONTRACT_ADDRESS) {
    console.log(`Ethereum host: ${ETHEREUM_HOST}`);
    console.log(`Rollup contract address: ${ROLLUP_CONTRACT_ADDRESS}`);
    const provider = new ethers.providers.WebSocketProvider(ETHEREUM_HOST);
    return { provider, signer: provider.getSigner(0), networkOrHost: ETHEREUM_HOST };
  }
}

async function blockchainFactory(ethConfig: EthereumBlockchainConfig, connection: Connection) {
  const ethereumBlockchain = await EthereumBlockchain.new(ethConfig, EthAddress.fromString(ROLLUP_CONTRACT_ADDRESS!));
  return PersistentEthereumBlockchain.new(ethereumBlockchain, connection);
}

async function main() {
  const serverConfig: ServerConfig = {
    rollupSize: +ROLLUP_SIZE,
    maxRollupWaitTime: moment.duration(+MAX_ROLLUP_WAIT_TIME, 's'),
    minRollupInterval: moment.duration(+MIN_ROLLUP_INTERVAL, 's'),
  };

  const connection = await createConnection();
  const ethConfig = getEthereumBlockchainConfig();
  const blockchain = ethConfig
    ? await blockchainFactory(ethConfig, connection)
    : new LocalBlockchain(connection, serverConfig.rollupSize, +LOCAL_BLOCKCHAIN_INIT_SIZE);
  const rollupDb = new RollupDb(connection);

  const shutdown = async () => {
    await connection.close();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  const worldStateDb = new WorldStateDb();
  const server = new Server(serverConfig, blockchain, rollupDb, worldStateDb);
  await server.start();

  const serverStatus = await server.status();
  const app = appFactory(server, API_PREFIX, connection, worldStateDb, serverConfig, serverStatus);

  const httpServer = http.createServer(app.callback());
  httpServer.listen(PORT);
  console.log(`Server listening on port ${PORT}.`);
}

main().catch(console.log);

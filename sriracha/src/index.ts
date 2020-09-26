import { EthAddress } from 'barretenberg/address';
import { WorldStateDb } from 'barretenberg/world_state_db';
import { EthereumBlockchain } from 'blockchain';
import { ethers, Signer } from 'ethers';
import http from 'http';
import 'reflect-metadata';
import { appFactory } from './app';
import Server from './server';
import 'log-timestamp';

const {
  PORT = '8082',
  ROLLUP_CONTRACT_ADDRESS,
  ETHEREUM_HOST = 'http://localhost:8545',
  INFURA_API_KEY,
  NETWORK,
  PRIVATE_KEY,
} = process.env;

function getEthereumBlockchainConfig() {
  if (INFURA_API_KEY && NETWORK && PRIVATE_KEY && ROLLUP_CONTRACT_ADDRESS) {
    console.log(`Infura network: ${NETWORK}`);
    console.log(`Rollup contract address: ${ROLLUP_CONTRACT_ADDRESS}`);
    const provider = new ethers.providers.InfuraProvider(NETWORK, INFURA_API_KEY);
    return { signer: new ethers.Wallet(PRIVATE_KEY, provider) as Signer, networkOrHost: NETWORK };
  } else if (ETHEREUM_HOST && ROLLUP_CONTRACT_ADDRESS) {
    console.log(`Ethereum host: ${ETHEREUM_HOST}`);
    console.log(`Rollup contract address: ${ROLLUP_CONTRACT_ADDRESS}`);
    const provider = new ethers.providers.WebSocketProvider(ETHEREUM_HOST);
    return { signer: provider.getSigner(0), networkOrHost: ETHEREUM_HOST };
  }
}

async function main() {
  const shutdown = async () => process.exit(0);
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  const worldStateDb = new WorldStateDb();
  const ethConfig = getEthereumBlockchainConfig();

  if (!ethConfig) {
    throw new Error('No ethereum config.');
  }

  const ethereumBlockchain = await EthereumBlockchain.new(ethConfig, EthAddress.fromString(ROLLUP_CONTRACT_ADDRESS!));

  const server = new Server(worldStateDb, ethereumBlockchain);
  await server.start();

  const app = appFactory(server, '/sriracha');

  const httpServer = http.createServer(app.callback());
  httpServer.listen(PORT);
  console.log(`Server listening on port ${PORT}.`);
}

main().catch(console.log);

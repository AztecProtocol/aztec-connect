import { WorldStateDb } from 'barretenberg/world_state_db';
import { EthereumBlockchain } from 'blockchain';
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
import { getConfig } from './config';
import { EthAddress } from 'barretenberg/address';

async function main() {
  const {
    provider,
    ethConfig,
    confVars: {
      rollupContractAddress,
      rollupSize,
      localBlockchainInitSize,
      maxRollupWaitTime,
      minRollupInterval,
      apiPrefix,
      serverAuthToken,
      port,
    },
  } = await getConfig();

  const connection = await createConnection();

  const blockchain =
    provider && ethConfig && rollupContractAddress
      ? await EthereumBlockchain.new(ethConfig, EthAddress.fromString(rollupContractAddress), provider.provider)
      : new LocalBlockchain(connection, rollupSize, localBlockchainInitSize);

  const serverConfig: ServerConfig = {
    rollupSize,
    maxRollupWaitTime: moment.duration(maxRollupWaitTime, 's'),
    minRollupInterval: moment.duration(minRollupInterval, 's'),
    signingAddress: provider?.signingAddress,
  };
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
  const app = appFactory(server, apiPrefix, connection, worldStateDb, serverStatus, serverAuthToken);

  const httpServer = http.createServer(app.callback());
  httpServer.listen(port);
  console.log(`Server listening on port ${port}.`);
}

main().catch(err => {
  console.log(err);
  process.exit(1);
});

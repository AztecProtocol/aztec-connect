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
import { Metrics } from './metrics';

async function main() {
  const {
    ormConfig,
    provider,
    ethConfig,
    confVars: {
      rollupContractAddress,
      innerRollupSize,
      outerRollupSize,
      localBlockchainInitSize,
      publishInterval,
      apiPrefix,
      serverAuthToken,
      port,
    },
  } = await getConfig();

  const connection = await createConnection(ormConfig);

  const blockchain =
    ethConfig.networkOrHost !== 'local'
      ? await EthereumBlockchain.new(ethConfig, EthAddress.fromString(rollupContractAddress!), provider)
      : new LocalBlockchain(connection, innerRollupSize * outerRollupSize, localBlockchainInitSize);

  const serverConfig: ServerConfig = {
    innerRollupSize,
    outerRollupSize,
    publishInterval: moment.duration(publishInterval, 's'),
  };
  const rollupDb = new RollupDb(connection);
  const worldStateDb = new WorldStateDb();
  const metrics = new Metrics(rollupDb);
  const server = new Server(serverConfig, blockchain, rollupDb, worldStateDb, metrics, provider);

  const shutdown = async () => {
    await server.stop();
    await connection.close();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  await server.start();

  const serverStatus = await server.getStatus();
  const app = appFactory(server, apiPrefix, metrics, connection, worldStateDb, serverStatus, serverAuthToken);

  const httpServer = http.createServer(app.callback());
  httpServer.listen(port);
  console.log(`Server listening on port ${port}.`);
}

main().catch(err => {
  console.log(err);
  process.exit(1);
});

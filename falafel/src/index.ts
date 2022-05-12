import 'log-timestamp';
import 'reflect-metadata';
import 'source-map-support/register';

// initEntities must be happen before any entities are imported.
import { Configurator } from './configurator';
import { initEntities } from './entity/init_entities';
const configurator = new Configurator();
initEntities(configurator.getConfVars().dbUrl);

import http from 'http';
import { WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { EthereumBlockchain } from '@aztec/blockchain';
import { emptyDir } from 'fs-extra';
import { createConnection } from 'typeorm';
import { appFactory } from './app';
import { Server } from './server';
import { getComponents } from './config';
import { Metrics } from './metrics';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { Container } from 'typedi';
import { CachedRollupDb, TypeOrmRollupDb } from './rollup_db';
import { InitHelpers } from '@aztec/barretenberg/environment';

async function main() {
  const { ormConfig, provider, signingAddress, ethConfig } = await getComponents(configurator);
  const {
    rollupContractAddress,
    feeDistributorAddress,
    priceFeedContractAddresses,
    apiPrefix,
    serverAuthToken,
    port,
    feePayingAssetAddresses,
  } = configurator.getConfVars();

  const connection = await createConnection(ormConfig);
  const blockchain = await EthereumBlockchain.new(
    ethConfig,
    rollupContractAddress,
    feeDistributorAddress,
    priceFeedContractAddresses,
    feePayingAssetAddresses,
    provider,
  );

  const barretenberg = await BarretenbergWasm.new();

  const chainId = await blockchain.getChainId();
  const { dataRoot } = InitHelpers.getInitRoots(chainId);
  const rollupDb = new CachedRollupDb(new TypeOrmRollupDb(connection, dataRoot));
  const worldStateDb = new WorldStateDb();

  if (configurator.getRollupContractChanged()) {
    console.log('Erasing databases...');
    await rollupDb.eraseDb();
    worldStateDb.destroy();
  }

  await rollupDb.init();
  const metrics = new Metrics(worldStateDb, rollupDb, blockchain);
  const server = new Server(configurator, signingAddress, blockchain, rollupDb, worldStateDb, metrics, barretenberg);

  const shutdown = async () => {
    await server.stop();
    await connection.close();
    process.exit(0);
  };
  const shutdownAndClearDb = async () => {
    await server.stop();
    await rollupDb.eraseDb();
    await connection.close();
    worldStateDb.destroy();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  process.once('SIGUSR1', shutdownAndClearDb);

  Container.set({ id: 'connection', factory: () => connection });
  Container.set({ id: 'rollupDb', factory: () => rollupDb });
  Container.set({ id: 'server', factory: () => server });
  const app = appFactory(server, apiPrefix, metrics, serverAuthToken);

  const httpServer = http.createServer(app.callback());
  httpServer.listen(port);
  console.log(`Server listening on port ${port}.`);

  await server.start();
}

main().catch(err => {
  console.log(err);
  process.exit(1);
});

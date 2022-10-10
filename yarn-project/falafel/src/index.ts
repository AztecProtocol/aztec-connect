import sourceMapSupport from 'source-map-support';
sourceMapSupport.install();
import 'log-timestamp';
import 'reflect-metadata';

// initEntities must be happen before any entities are imported.
import { Configurator } from './configurator.js';
import { initEntities } from './entity/init_entities.js';
const configurator = new Configurator();
initEntities(configurator.getConfVars().dbUrl);

import http from 'http';
import { WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { EthereumBlockchain } from '@aztec/blockchain';
import { DataSource } from 'typeorm';
import { appFactory } from './app.js';
import { Server } from './server.js';
import { getComponents } from './config.js';
import { Metrics } from './metrics/index.js';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { Container } from 'typedi';
import { CachedRollupDb, TypeOrmRollupDb } from './rollup_db/index.js';
import { InitHelpers } from '@aztec/barretenberg/environment';

async function main() {
  const { ormConfig, provider, signingAddress, ethConfig } = await getComponents(configurator);
  const {
    rollupContractAddress,
    permitHelperContractAddress,
    priceFeedContractAddresses,
    apiPrefix,
    serverAuthToken,
    port,
    runtimeConfig: { rollupBeneficiary = signingAddress },
  } = configurator.getConfVars();

  const dataSource = new DataSource(ormConfig);
  await dataSource.initialize();
  const blockchain = await EthereumBlockchain.new(
    ethConfig,
    rollupContractAddress,
    permitHelperContractAddress,
    priceFeedContractAddresses,
    provider,
  );

  const barretenberg = await BarretenbergWasm.new();

  const chainId = await blockchain.getChainId();
  const { dataRoot } = InitHelpers.getInitRoots(chainId);
  const rollupDb = new CachedRollupDb(new TypeOrmRollupDb(dataSource, dataRoot));
  const worldStateDb = new WorldStateDb();

  if (configurator.getRollupContractChanged()) {
    console.log('Erasing sql database...');
    await rollupDb.eraseDb();
    console.log('Erasing world state database...');
    worldStateDb.destroy();
  }

  await rollupDb.init();
  const metrics = new Metrics(worldStateDb, rollupDb, blockchain, rollupBeneficiary);
  const server = new Server(configurator, signingAddress, blockchain, rollupDb, worldStateDb, metrics, barretenberg);

  const shutdown = async () => {
    await server.stop();
    await dataSource.destroy();
    process.exit(0);
  };
  const shutdownAndClearDb = async () => {
    await server.stop();
    await rollupDb.eraseDb();
    await dataSource.destroy();
    worldStateDb.destroy();
    console.log('Databases erased.');
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  process.once('SIGUSR1', shutdownAndClearDb);

  Container.set({ id: 'connection', factory: () => dataSource });
  Container.set({ id: 'rollupDb', factory: () => rollupDb });
  Container.set({ id: 'server', factory: () => server });
  const app = await appFactory(server, apiPrefix, metrics, serverAuthToken);

  const httpServer = http.createServer(app.callback());
  httpServer.listen(port);
  console.log(`Server listening on port ${port}.`);

  await server.start();
}

main().catch(err => {
  console.log(err);
  process.exit(1);
});

// initEntities must be happen before any entities are imported.
import { Configurator } from './configurator';
import { initEntities } from './entity/init_entities';
const configurator = new Configurator();
initEntities(configurator.getConfVars().dbUrl);

import 'reflect-metadata';
import 'source-map-support/register';
import 'log-timestamp';
import http from 'http';
import { WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { EthereumBlockchain } from '@aztec/blockchain';
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
  const { ormConfig, provider, signingAddress, ethConfig, bridgeConfigs } = await getComponents(configurator);
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
  const { initDataRoot } = InitHelpers.getInitRoots(chainId);
  const rollupDb = new CachedRollupDb(new TypeOrmRollupDb(connection, initDataRoot));
  if (configurator.getRollupContractChanged()) {
    await rollupDb.eraseDb();
  }
  await rollupDb.init();
  const worldStateDb = new WorldStateDb();
  const metrics = new Metrics(worldStateDb, rollupDb, blockchain);
  const server = new Server(
    configurator,
    signingAddress,
    bridgeConfigs,
    blockchain,
    rollupDb,
    worldStateDb,
    metrics,
    barretenberg,
  );

  const shutdown = async () => {
    await server.stop();
    await connection.close();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

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

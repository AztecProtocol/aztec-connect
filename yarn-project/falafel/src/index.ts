import sourceMapSupport from 'source-map-support';
sourceMapSupport.install();
import 'log-timestamp';
import 'reflect-metadata';
import http from 'http';
import { Container } from 'typedi';
import { appFactory } from './app.js';
import { Server } from './server.js';
import { getComponents } from './get_components.js';
import { Metrics } from './metrics/index.js';
import { configurator } from './entity/init_entities.js';

async function main() {
  const { signingAddress, blockchain, rollupDb, worldStateDb, barretenberg, dataSource } = await getComponents(
    configurator,
  );
  const {
    apiPrefix,
    serverAuthToken,
    port,
    runtimeConfig: { rollupBeneficiary = signingAddress },
  } = configurator.getConfVars();

  const metrics = new Metrics(worldStateDb, rollupDb, blockchain, rollupBeneficiary);
  const server = new Server(configurator, signingAddress, blockchain, rollupDb, worldStateDb, metrics, barretenberg);

  const shutdown = async () => {
    await server.stop();
    await rollupDb.destroy();
    process.exit(0);
  };
  const shutdownAndClearDb = async () => {
    await server.stop();
    await rollupDb.eraseDb();
    await rollupDb.destroy();
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

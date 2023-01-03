import 'log-timestamp';
import http from 'http';
import { createConnection } from 'typeorm';

import { getComponents } from './config.js';
import { Configurator } from './configurator.js';
import { Server } from './server.js';
import { appFactory } from './app.js';
import { EthLogsDb } from './log_db.js';

const configurator = new Configurator();

async function main() {
  const { ormConfig, provider, chainId } = await getComponents(configurator);

  const configuration = configurator.getConfVars();
  const { rollupContractAddress, allowPrivilegedMethods, port, apiPrefix } = configuration;

  console.log(`Rollup contract address: ${rollupContractAddress}`);
  console.log(`Allow privileged methods: ${allowPrivilegedMethods}`);
  console.log(`Chain id: ${chainId}`);

  const dbConn = await createConnection(ormConfig);
  const logDb = new EthLogsDb(dbConn);
  const server = new Server(provider, configuration.ethereumHost, logDb, chainId, configuration);

  const shutdown = async () => {
    await server.stop();
    await dbConn.close();
    process.exit(0);
  };

  const shutdownAndClearDb = async () => {
    await server.stop();
    await logDb.eraseDb();
    await dbConn.close();
    console.log('Kebab Database erased.');
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  process.once('SIGUSR1', shutdownAndClearDb);

  const app = appFactory(server, apiPrefix);
  const httpServer = http.createServer(app.callback());
  httpServer.listen(port);
  console.log(`Kebab Server listening on port ${port}.`);

  await server.start();
}

main().catch(err => {
  console.log(err);
  process.exit(1);
});

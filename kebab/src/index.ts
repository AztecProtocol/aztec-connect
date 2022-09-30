import 'log-timestamp';
import http from 'http';
import { createConnection } from 'typeorm';

import { getComponents } from './config';
import { Configurator } from './configurator';
import { Server } from './server';
import { appFactory } from './app';
import { EthLogsDb } from './logDb';

const configurator = new Configurator();

async function main() {
  const { ormConfig, provider, chainId } = await getComponents(configurator);
  const { rollupContractAddress, port, apiPrefix, allowPrivilegedMethods } = configurator.getConfVars();

  const dbConn = await createConnection(ormConfig);
  const logDb = new EthLogsDb(dbConn);
  const server = new Server(rollupContractAddress, provider, logDb, chainId, allowPrivilegedMethods);

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

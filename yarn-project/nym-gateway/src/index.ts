import 'log-timestamp';
import http from 'http';

import { Server } from './server.js';
import { appFactory } from './app.js';
import { getConfig } from './config.js';

async function main() {
  // basic nym config
  const { nymHost, nymPort, apiPrefix, port } = getConfig();
  const nymClientUrl = `ws:${nymHost}:${nymPort}`;

  const server = new Server(nymClientUrl);

  await server.start();

  const shutdown = async () => {
    if (server.isRunning()) {
      await server.stop();
    }
    process.exit(0);
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  const app = appFactory(server, apiPrefix);
  const httpServer = http.createServer(app.callback());
  httpServer.listen(port);
  console.log(`NYM gateway server listening on port ${port}`);
}

main().catch(err => {
  console.log(err);
  process.exit(1);
});

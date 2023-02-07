import 'log-timestamp';
import http from 'http';

import { Server } from './server.js';
import { appFactory } from './app.js';

async function main() {
  // basic nym config
  // TODO: move to a config file
  const port = process.env.PORT || 8085;
  const nymHost = process.env.NYM_HOST || '127.0.0.1';
  const nymPort = process.env.NYM_PORT || '1977';
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

  const app = appFactory(server);
  const httpServer = http.createServer(app.callback());
  httpServer.listen(port);
  console.log(`NYM gateway server listening on port ${port}`);
}

main().catch(err => {
  console.log(err);
  process.exit(1);
});

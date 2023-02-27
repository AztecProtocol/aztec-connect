import sourceMapSupport from 'source-map-support';
sourceMapSupport.install();
import 'log-timestamp';
import 'reflect-metadata';
import http from 'http';
import { appFactory } from './app.js';
import { Server } from './server.js';

// PORT: The port the service will listen on.
// FALAFEL_URL: The URL of the falafel service.
// API_PREFIX: The prefix to add to all API routes. (e.g. '/block-server/production')
// INIT_FULL_SYNC: Whether to perform a full sync on initialization (see Server constructor for more details).
const { PORT = '8084', FALAFEL_URL = 'http://localhost:8081', API_PREFIX = '', INIT_FULL_SYNC = false } = process.env;

async function main() {
  const initFullSync = INIT_FULL_SYNC === 'true';
  const falafelUrl = new URL(FALAFEL_URL);
  const server = new Server(falafelUrl, initFullSync);

  const shutdown = async () => {
    await server.stop();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  const app = appFactory(server, falafelUrl, API_PREFIX);

  const httpServer = http.createServer(app.callback());
  httpServer.listen(+PORT);
  console.log(`Server listening on port ${PORT}.`);

  await server.start();
}

main().catch(err => {
  console.log(err);
  process.exit(1);
});

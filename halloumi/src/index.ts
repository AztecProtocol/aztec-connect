import http from 'http';
import 'source-map-support/register';
import { appFactory } from './app';
import { Server, ServerConfig } from './server';
import 'log-timestamp';

const { PORT = '8083', MAX_CIRCUIT_SIZE = '8388608', ROLLUP_SHAPES = '1x2', API_PREFIX = '' } = process.env;

async function main() {
  const serverConfig: ServerConfig = {
    maxCircuitSize: +MAX_CIRCUIT_SIZE,
    rollupShapes: ROLLUP_SHAPES,
  };
  const server = new Server(serverConfig);
  const shutdown = async () => {
    await server.stop();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  const app = appFactory(server, API_PREFIX);

  const httpServer = http.createServer(app.callback());
  httpServer.listen(PORT);
  console.log(`Server listening on port ${PORT}.`);

  await server.start();
}

main().catch(err => {
  console.log(err);
  process.exit(1);
});

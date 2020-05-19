import http from 'http';
import 'reflect-metadata';
import 'source-map-support/register';
import { appFactory } from './app';
import { Server } from './server';

const { PORT = 80 } = process.env;

async function main() {
  const shutdown = async () => process.exit(0);
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  const server = new Server(2);
  await server.start();

  const app = appFactory(server, '/api');

  const httpServer = http.createServer(app.callback());
  httpServer.listen(PORT);
  console.log(`Server listening on port ${PORT}.`);
}

main().catch(console.log);

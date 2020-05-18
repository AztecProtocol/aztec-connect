import http from 'http';
import 'reflect-metadata';
import { appFactory } from './app';

const { PORT = 80, INFURA_API_KEY = '' } = process.env;

async function main() {
  const shutdown = async () => process.exit(0);
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  const app = appFactory('/api');

  const httpServer = http.createServer(app.callback());
  httpServer.listen(PORT);
  console.log(`Server listening on port ${PORT}.`);
}

main().catch(console.log);

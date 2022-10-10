import sourceMapSupport from 'source-map-support';
sourceMapSupport.install();
import 'log-timestamp';
import { Server, ServerConfig } from './server.js';
import { HttpJobWorker } from './proof_generator/index.js';
import { appFactory } from './app.js';
import http from 'http';

const {
  MAX_CIRCUIT_SIZE = '8388608',
  NUM_INNER_ROLLUP_TXS = '1',
  NUM_OUTER_ROLLUP_PROOFS = '1',
  PROVERLESS,
  LAZY_INIT,
  PERSIST,
  DATA_DIR = './data',
  JOB_SERVER_URL = 'http://localhost:8082',
  API_PREFIX = '',
  PORT = '8083',
} = process.env;

async function main() {
  const serverConfig: ServerConfig = {
    maxCircuitSize: +MAX_CIRCUIT_SIZE,
    txsPerInner: +NUM_INNER_ROLLUP_TXS,
    innersPerRoot: +NUM_OUTER_ROLLUP_PROOFS,
    proverless: PROVERLESS === 'true',
    lazyInit: LAZY_INIT === 'true',
    persist: PERSIST === 'true',
    dataDir: DATA_DIR,
  };
  const server = new Server(serverConfig);
  const worker = new HttpJobWorker(server, JOB_SERVER_URL);

  const shutdown = async () => {
    await worker.stop();
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
  worker.start();
}

main().catch(err => {
  console.log(err);
  process.exit(1);
});

import 'source-map-support/register';
import { Server, ServerConfig } from './server';
import { HttpJobWorker } from './proof_generator/http_job_worker';
import 'log-timestamp';

const {
  MAX_CIRCUIT_SIZE = '8388608',
  NUM_INNER_ROLLUP_TXS = '1',
  NUM_OUTER_ROLLUP_PROOFS = '1',
  PROVERLESS,
  LAZY_INIT,
  PERSIST,
  DATA_DIR = './data',
  JOB_SERVER_URL = 'http://localhost:3302',
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

  await server.start();
  await worker.start();
}

main().catch(err => {
  console.log(err);
  process.exit(1);
});

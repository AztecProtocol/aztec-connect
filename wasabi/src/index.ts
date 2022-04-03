import 'log-timestamp';
import 'source-map-support/register';
import { run } from './run';

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  PRIVATE_KEY = '',
  AGENT_TYPE = 'payment',
  NUM_AGENTS = '1',
  NUM_DEFI_SWAPS = '20',
  NUM_PAYMENTS = '20',
  LOOPS = '1',
  ROLLUP_HOST = 'http://localhost:8081',
  CONFS = '1',
} = process.env;

async function main() {
  const shutdown = async () => process.exit(0);
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  await run(
    Buffer.from(PRIVATE_KEY, 'hex'),
    AGENT_TYPE,
    +NUM_AGENTS,
    +NUM_DEFI_SWAPS,
    +NUM_PAYMENTS,
    ROLLUP_HOST,
    ETHEREUM_HOST,
    +CONFS,
    +LOOPS,
  );
}

main().catch(console.log);

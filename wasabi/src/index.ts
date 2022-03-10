import { AgentManager } from './agent_manager';
import 'log-timestamp';
import 'source-map-support/register';

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  PRIVATE_KEY = '',
  AGENT_TYPE = 'payment',
  NUM_AGENTS = '1',
  NUM_DEFI_SWAPS = '20',
  NUM_PAYMENTS = '20',
  LOOPS = '1',
  ROLLUP_HOST = 'http://localhost:8081',
  MEMORY_DB = '0',
} = process.env;

async function main() {
  const shutdown = async () => process.exit(0);
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  const loops = +LOOPS;
  for (let runNumber = 0; runNumber != loops; ++runNumber) {
    const agentManager = new AgentManager(
      Buffer.from(PRIVATE_KEY, 'hex'),
      AGENT_TYPE,
      +NUM_AGENTS,
      +NUM_DEFI_SWAPS,
      +NUM_PAYMENTS,
      ROLLUP_HOST,
      ETHEREUM_HOST,
      !!+MEMORY_DB,
    );
    await agentManager.run(runNumber);
  }
}

main().catch(console.log);

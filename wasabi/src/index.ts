import { AgentManager } from './agent_manager';
import 'log-timestamp';
import 'source-map-support/register';

const {
  ETHEREUM_HOST = 'https://goerli.infura.io/v3/6a04b7c89c5b421faefde663f787aa35',
  NUM_DEFI_AGENTS = '1',
  NUM_PAYMENT_AGENTS = '1',
  LOOP = '0',
  ROLLUP_HOST = 'https://api.aztec.network/falafel',
  NUM_SDKS = '8',
  ROLLUP_SIZE = '112',
  MEMORY_DB = '0',
} = process.env;

async function main() {
  const shutdown = async () => process.exit(0);
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  const loop = +LOOP;
  const numSdks = +NUM_SDKS;
  let count = 1;
  do {
    const agent = new AgentManager(
      +NUM_DEFI_AGENTS,
      +NUM_PAYMENT_AGENTS,
      ROLLUP_HOST,
      ETHEREUM_HOST,
      !!+MEMORY_DB,
      numSdks,
      +ROLLUP_SIZE,
    );
    await agent.start(count);
    await agent.shutdown();
    count += 1;
  } while (loop > 0);
}

main().catch(console.log);

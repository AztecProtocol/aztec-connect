import AgentManager from './agent_manager';
import { toBaseUnits, WalletProvider } from '@aztec/sdk';
import 'log-timestamp';
import 'source-map-support/register';

const {
  ETHEREUM_HOST = 'https://goerli.infura.io/v3/6a04b7c89c5b421faefde663f787aa35',
  NUM_ACCOUNTS = '1',
  NUM_TRANSFERS = '10',
  ROLLUP_HOST = 'https://api.aztec.network/falafel',
  MNEMONIC = 'shrimp diagram word bacon also lend monkey allow kiss credit have neck',
} = process.env;

async function main() {
  const shutdown = async () => process.exit(0);
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  const provider = WalletProvider.fromHost(ETHEREUM_HOST);
  const agent = new AgentManager(
    +NUM_ACCOUNTS,
    +NUM_TRANSFERS,
    ROLLUP_HOST,
    toBaseUnits('0.1', 18),
    MNEMONIC,
    provider,
  );
  await agent.start();
}

main().catch(console.log);

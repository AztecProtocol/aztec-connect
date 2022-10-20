import sourceMapSupport from 'source-map-support';
sourceMapSupport.install();
import 'log-timestamp';
import { run } from './run.js';
import { refundAddress } from './refund.js';
import cluster, { Worker } from 'node:cluster';

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  PRIVATE_KEY = '',
  MNEMONIC,
  ACCOUNT_OFFSET = '0',
  AGENT_TYPE = 'payment',
  ASSETS = '0',
  NUM_AGENTS = '1',
  NUM_TXS_PER_AGENT = '1',
  NUM_CONCURRENT_TXS = '1',
  NUM_FORKS = '8',
  ACCOUNT,
  ROLLUP_HOST = 'http://localhost:8081',
  CONFS = '1',
  LOOPS,
  GAS_PRICE_GWEI = '50',
} = process.env;

const children: Worker[] = [];

const handle = () => {
  for (const child of children) {
    child.process.kill('SIGINT');
  }
};

process.once('SIGINT', handle);
process.once('SIGTERM', handle);

async function runApp() {
  await run(
    Buffer.from(PRIVATE_KEY, 'hex'),
    AGENT_TYPE,
    +NUM_AGENTS,
    +NUM_TXS_PER_AGENT,
    +NUM_CONCURRENT_TXS,
    ASSETS.split(',').map(x => +x),
    ROLLUP_HOST,
    ETHEREUM_HOST,
    +CONFS,
    +GAS_PRICE_GWEI,
    LOOPS ? +LOOPS : undefined,
    MNEMONIC ? MNEMONIC : undefined,
    ACCOUNT ? +ACCOUNT : undefined,
  );
}

async function forkChildren() {
  if (cluster.isWorker) {
    await runApp();
    process.exit(0);
  }
  const numForks = +NUM_FORKS;
  const accountOffset = +ACCOUNT_OFFSET;
  for (let i = 0; i < numForks; i++) {
    const accountValue = accountOffset + i + 1;
    const worker = cluster.fork({ ACCOUNT: accountValue });
    worker.on('exit', (code, signal) => {
      if (signal) {
        console.log(`child ${i} was killed by signal: ${signal}`);
      } else if (code !== 0) {
        console.log(`child ${i} exited with error code: ${code}`);
      } else {
        console.log(`child ${i} completed successfully!`);
      }
    });
    children.push(worker);
    console.log(`forked child with pid: ${worker.process.pid} and acount ${accountValue}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  while (children.some(child => child.isConnected())) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function refundPrimaryAddress() {
  // the 'process address' for wasabi test runs uses index 0, the agenst start from 1
  // we want to sweep them all
  const numAccountIndexes = +NUM_AGENTS + 1;
  const accountOffset = +ACCOUNT_OFFSET;
  const numAccounts = +NUM_FORKS + 1;
  await refundAddress(
    ETHEREUM_HOST,
    Buffer.from(PRIVATE_KEY, 'hex'),
    MNEMONIC!,
    accountOffset,
    numAccounts,
    numAccountIndexes,
    +GAS_PRICE_GWEI,
  );
}

async function main() {
  if (!MNEMONIC) {
    await runApp();
    return;
  }
  if (AGENT_TYPE == 'refund') {
    await refundPrimaryAddress();
    return;
  }
  await forkChildren();
}

main().catch(console.log);

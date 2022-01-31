import { AztecSdk, JsonRpcProvider, MemoryFifo, SdkEvent, TxSettlementTime, WalletProvider } from '@aztec/sdk';
import { Agent } from './agent';
import { DefiAgent } from './defi_agent';
import { SimpleAgent } from './simple_agent';
import { Stats } from './stats';

export class AgentManager {
  private sdks: AztecSdk[] = [];
  private agents: Agent[] = [];
  private queues: MemoryFifo<() => Promise<void>>[] = [];

  public constructor(
    private numDefiAgents: number,
    private numPaymentAgents: number,
    private numDefiSwaps: number,
    private numPayments: number,
    private rollupHost: string,
    private host: string,
    private memoryDB: boolean,
    private numSdks: number,
    private rollupSize: number,
  ) {}

  public async start(runNumber: number) {
    console.log(`Starting wasabi run ${runNumber}...`);

    const ethereumProvider = new JsonRpcProvider(this.host);
    const walletProvider = new WalletProvider(ethereumProvider);

    const accounts = await ethereumProvider.getAccounts();
    console.log(`Master account: ${accounts[0]}`);

    for (let i = 0; i < this.numSdks; i++) {
      const sdk = await AztecSdk.create(walletProvider, this.rollupHost, {
        syncInstances: false,
        saveProvingKey: false,
        clearDb: true,
        debug: false,
        memoryDb: this.memoryDB,
        identifier: `${i + 1}`,
      });

      sdk.on(SdkEvent.LOG, console.log);

      await sdk.init();

      // console.log('Synching data tree...');
      await sdk.awaitSynchronised();
      this.sdks.push(sdk);
      const queue = new MemoryFifo<() => Promise<void>>();
      queue.process(fn => fn());
      this.queues.push(queue);
    }

    // flush fee is an amount that's guaranteed to push through a rollup
    const flushFee = (await this.sdks[0].getDepositFees(0))[TxSettlementTime.INSTANT].value;
    this.agents = new Array<Agent>();
    const totalNumAgents = this.numPaymentAgents + this.numDefiAgents;
    while (this.agents.length < totalNumAgents) {
      try {
        const agent =
          this.agents.length >= this.numDefiAgents
            ? new SimpleAgent(
                accounts[0],
                this.sdks[this.agents.length % this.sdks.length],
                walletProvider,
                this.agents.length,
                this.queues[this.agents.length % this.queues.length],
                this.numPayments,
              )
            : new DefiAgent(
                accounts[0],
                this.sdks[this.agents.length % this.sdks.length],
                walletProvider,
                this.agents.length,
                this.queues[this.agents.length % this.queues.length],
                this.numDefiSwaps,
              );
        await agent.setup(this.agents.length === totalNumAgents - 1 ? flushFee : undefined);
        await agent.depositToRollup();
        this.agents.push(agent);
      } catch (err) {
        console.log(err);
      }
    }

    const stats: Stats = {
      numDefi: 0,
      numDeposits: 0,
      numPayments: 0,
      numWithdrawals: 0,
    };

    // start all but the last agent
    const firstAgents = this.agents.slice(0, this.agents.length - 1);
    const runningPromises = firstAgents.map(a => a.run(stats));

    console.log('Awaiting sending of deposits...');
    const depositPromises = firstAgents.map(agent => agent.depositPromise);
    await Promise.all(depositPromises);

    const lastAgent = this.agents[this.agents.length - 1];
    runningPromises.push(lastAgent.run(stats));

    const start = new Date();
    await Promise.all(runningPromises);
    const end = new Date();

    console.log('Repaying source address...');
    for (let i = 0; i < totalNumAgents; i++) {
      await this.agents[i].repaySourceAddress();
    }
    const timeTaken = end.getTime() - start.getTime();
    console.log(`Test run ${runNumber} completed...`);
    console.log(`Time taken: ${timeTaken / 1000}s. Stats: `, stats);
  }

  public async shutdown() {
    await Promise.all(this.queues.map(queue => queue.cancel()));
    await Promise.all(this.sdks.map(sdk => sdk.destroy()));
  }
}

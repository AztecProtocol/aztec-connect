import { AztecSdk, createNodeAztecSdk, EthAddress, EthereumRpc, JsonRpcProvider, WalletProvider } from '@aztec/sdk';
// import { DefiAgent } from './defi_agent';
import { PaymentAgent } from './payment_agent';

export class AgentManager {
  private fundingAddress!: EthAddress;
  private sdk!: AztecSdk;
  private provider!: WalletProvider;

  public constructor(
    private privateKey: Buffer,
    private agentType: string,
    private numAgents: number,
    private numDefiSwaps: number,
    private numPayments: number,
    private rollupHost: string,
    private host: string,
    private memoryDB: boolean,
    private confs: number,
  ) {}

  private createAgent(id: number) {
    switch (this.agentType) {
      case 'payment':
        return new PaymentAgent(this.fundingAddress, this.sdk, this.provider, id, this.numPayments);
      // case 'defi':
      //   return new DefiAgent(this.fundingAddress, this.sdk, this.provider, this.agents.length, this.numDefiSwaps);
      default:
        throw new Error(`Unknown agent type: ${this.agentType}`);
    }
  }

  private async initSdk() {
    const sdk = await createNodeAztecSdk(this.provider, {
      serverUrl: this.rollupHost,
      debug: false,
      memoryDb: this.memoryDB,
      minConfirmation: this.confs,
      minConfirmationEHW: this.confs,
    });

    // sdk.on(SdkEvent.LOG, console.log);

    await sdk.run();
    await sdk.awaitSynchronised();
    return sdk;
  }

  public async run(runNumber: number) {
    console.log(`Starting wasabi run ${runNumber}...`);
    const start = new Date();

    const ethereumProvider = new JsonRpcProvider(this.host);
    const ethereumRpc = new EthereumRpc(ethereumProvider);
    this.provider = new WalletProvider(ethereumProvider);
    this.sdk = await this.initSdk();

    if (this.privateKey.length) {
      this.fundingAddress = this.provider.addAccount(this.privateKey);
    } else {
      [this.fundingAddress] = await ethereumRpc.getAccounts();
    }

    const fundingAddressBalance = await this.sdk.getPublicBalanceAv(0, this.fundingAddress);
    console.log(`Funding account: ${this.fundingAddress} (${this.sdk.fromBaseUnits(fundingAddressBalance, true)})`);

    const agents = Array.from({ length: this.numAgents }).map((_, i) => this.createAgent(i));

    // Flushing agent flushes rollups whenever all agents are awaiting settlement.
    // const flushingAgent = new FlushingAgent(this.fundingAddress, this.sdk, this.provider, agents);
    // await flushingAgent.init();
    // flushingAgent.run();

    // Agents should be initialized sequentially to allow for correct sequential L1
    // nonces when funding from the funding address.
    for (const agent of agents) {
      await agent.init();
    }

    await Promise.all(agents.map(a => a.run()));

    // flushingAgent.stop();
    await this.sdk.destroy();

    const timeTaken = new Date().getTime() - start.getTime();
    console.log(`Test run ${runNumber} completed: ${timeTaken / 1000}s.`);
  }
}

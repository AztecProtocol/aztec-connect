import { WalletSdk, WalletProvider, SdkEvent, MemoryFifo } from '@aztec/sdk';
import { Web3Provider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import { Agent } from './agent';
import { SimpleAgent } from './simple_agent';
import { DefiAgent } from './defi_agent';
import { NonceManager } from '@ethersproject/experimental';
// import { DepositingAgent } from './depositing_agent';

export class AgentManager {
  private sdk!: WalletSdk;
  private agents: Agent[] = [];
  private queue = new MemoryFifo<() => Promise<void>>();

  public constructor(
    private numDefiAgents: number,
    private numPaymentAgents: number,
    private rollupHost: string,
    private mnemonic: string,
    private provider: WalletProvider,
    private dbPath: string,
  ) {}

  public async start(loop: boolean) {
    console.log('Starting wasabi...');

    const ethersProvider = new Web3Provider(this.provider);
    const masterWallet = new NonceManager(
      Wallet.fromMnemonic(this.mnemonic, `m/44'/60'/0'/0/0`).connect(ethersProvider),
    );

    console.log(`Master account: ${await masterWallet.getAddress()}`);

    this.sdk = await WalletSdk.create(this.provider, this.rollupHost, {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
      debug: false,
      dbPath: this.dbPath,
    });

    this.sdk.on(SdkEvent.LOG, console.log);

    await this.sdk.init();

    // console.log('Synching data tree...');
    await this.sdk.awaitSynchronised();

    // Task queue to serialize sdk access.
    this.queue.process(fn => fn());

    // this.agents = Array(this.numAgents)
    //   .fill(0)
    //   .map(
    //     (_, i) =>
    //       new DepositingAgent(
    //         this.sdk,
    //         this.provider,
    //         masterWallet,
    //         Wallet.fromMnemonic(this.mnemonic, `m/44'/60'/0'/0/${i + 1}`).connect(ethersProvider),
    //         i,
    //         this.queue,
    //       ),
    //   );

    this.agents = Array(this.numDefiAgents + this.numPaymentAgents)
      .fill(0)
      .map((_, i) =>
        i >= this.numDefiAgents
          ? new SimpleAgent(this.sdk, this.provider, masterWallet, i, this.queue, loop)
          : new DefiAgent(this.sdk, this.provider, masterWallet, i, this.queue, loop, 5),
      );

    await Promise.all(this.agents.map(a => a.run()));
  }

  public async shutdown() {
    this.queue.cancel();
    await this.sdk.destroy();
  }
}

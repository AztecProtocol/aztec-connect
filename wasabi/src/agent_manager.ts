import { WalletSdk, WalletProvider, SdkEvent, MemoryFifo } from '@aztec/sdk';
import { Web3Provider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import { Agent } from './agent';
import { SimpleAgent } from './simple_agent';
import { NonceManager } from '@ethersproject/experimental';
// import { DepositingAgent } from './depositing_agent';

export class AgentManager {
  private sdk!: WalletSdk;
  private agents: Agent[] = [];
  private queue = new MemoryFifo<() => Promise<void>>();

  public constructor(
    private numAgents: number,
    private rollupHost: string,
    private mnemonic: string,
    private provider: WalletProvider,
  ) {}

  public async start() {
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
      dbPath: ':memory:',
    });

    this.sdk.on(SdkEvent.LOG, console.log);

    await this.sdk.init();

    // console.log('Synching data tree...');
    // await this.sdk.awaitSynchronised();

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

    this.agents = Array(this.numAgents)
      .fill(0)
      .map((_, i) => new SimpleAgent(this.sdk, this.provider, masterWallet, i, this.queue));

    await Promise.all(this.agents.map(a => a.run()));
  }
}

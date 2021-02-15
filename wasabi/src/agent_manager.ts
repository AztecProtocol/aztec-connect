import { WalletSdk, WalletProvider, SdkEvent } from '@aztec/sdk';
import { Web3Provider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import Agent from './agent';

export default class AgentManager {
  private sdk!: WalletSdk;
  private agents: Agent[] = [];
  private running = false;

  public constructor(
    private numAccounts: number,
    private numTransfers: number,
    private rollupHost: string,
    private minBalance: bigint,
    private mnemonic: string,
    private provider: WalletProvider,
  ) {}

  public async start() {
    console.log('Starting wasabi...');

    const ethersProvider = new Web3Provider(this.provider);
    const masterWallet = Wallet.fromMnemonic(this.mnemonic, `m/44'/60'/0'/0/0`).connect(ethersProvider);

    this.sdk = await WalletSdk.create(this.provider, this.rollupHost, {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
      debug: false,
      dbPath: ':memory:',
    });

    this.sdk.on(SdkEvent.LOG, console.log);

    await this.sdk.init();

    console.log('Synching data tree...');
    await this.sdk.awaitSynchronised();

    for (let i = 0; i < this.numAccounts; i++) {
      this.agents.push(new Agent(this.sdk, this.provider, i, this.minBalance, masterWallet, this.numTransfers));
    }

    this.running = true;
    while (this.running) {
      for (const agent of this.agents) {
        await agent.advanceAgent();
      }
      // Try advancing all agents every 5 seconds.
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  public async stop() {
    // TODO
    this.running = false;
  }
}

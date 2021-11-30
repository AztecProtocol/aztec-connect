import { MemoryFifo, TxHash, WalletSdk } from '@aztec/sdk';

export abstract class Agent {
  constructor(
    protected type: string,
    protected sdk: WalletSdk,
    protected id: number,
    private queue: MemoryFifo<() => Promise<void>>,
  ) {}

  /**
   * The SDK does not support parallel execution.
   * Given a function that resolves to a TxHash, will execute that function in serial across all agents sharing the
   * queue. Resolves when the TxHash is settled.
   */
  protected async serializeTx(fn: () => Promise<TxHash | undefined>) {
    const txHash = await this.serializeAny(fn);
    if (!txHash) {
      return;
    }
    console.log(`Agent ${this.id} awaiting settlement...`);
    await this.sdk.awaitSettlement(txHash, 3600 * 12);
  }

  protected async serializeAny(fn: () => Promise<any>) {
    return await new Promise<any>((resolve, reject) => this.queue.put(() => fn().then(resolve).catch(reject)));
  }

  protected agentId() {
    return `${this.type} agent ${this.id}`;
  }

  abstract run(): Promise<void>;
}

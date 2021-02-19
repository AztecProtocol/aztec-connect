import { MemoryFifo, TxHash, WalletSdk } from '@aztec/sdk';

export abstract class Agent {
  constructor(protected sdk: WalletSdk, protected id: number, private queue: MemoryFifo<() => Promise<void>>) {}

  /**
   * The SDK does not support parallel execution.
   * Given a function that resolves to a TxHash, will execute that function in serial across all agents sharing the
   * queue. Resolves when the TxHash is settled.
   */
  protected async serialize(fn: () => Promise<TxHash>) {
    const txHash = await new Promise<TxHash>((resolve, reject) =>
      this.queue.put(() => fn().then(resolve).catch(reject)),
    );
    console.log(`Agent ${this.id} awaiting settlement...`);
    await this.sdk.awaitSettlement(txHash, 3600 * 12);
  }

  abstract run(): Promise<void>;
}

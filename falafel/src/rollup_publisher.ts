import { EthAddress } from 'barretenberg/address';
import { Blockchain } from 'blockchain';
import { RollupDb } from './rollup_db';

export interface PublishItem {
  rollupId: number;
  proof: Buffer;
  signatures: Buffer[];
  sigIndexes: number[];
  viewingKeys: Buffer[];
}

export class RollupPublisher {
  private interrupted = false;
  private interruptPromise = Promise.resolve();
  private interruptResolve = () => {};

  constructor(private rollupDb: RollupDb, private blockchain: Blockchain, private signingAddress?: EthAddress) {}

  private async sendRollupProof(item: PublishItem) {
    const { proof, signatures, sigIndexes, viewingKeys } = item;
    while (!this.interrupted) {
      try {
        return await this.blockchain.sendRollupProof(proof, signatures, sigIndexes, viewingKeys, this.signingAddress);
      } catch (err) {
        console.log(err);
        await this.sleepOrInterrupted(10000);
      }
    }
  }

  private async getTransactionReceipt(txHash: Buffer) {
    while (!this.interrupted) {
      try {
        return await this.blockchain.getTransactionReceipt(txHash);
      } catch (err) {
        console.log(err);
        await this.sleepOrInterrupted(10000);
      }
    }
  }

  public async publishRollup(item: PublishItem) {
    while (!this.interrupted) {
      this.interruptPromise = new Promise(resolve => (this.interruptResolve = resolve));

      const txHash = await this.sendRollupProof(item);
      if (!txHash) {
        break;
      }

      await this.rollupDb.confirmSent(item.rollupId, txHash);

      const receipt = await this.getTransactionReceipt(txHash);
      if (!receipt) {
        break;
      }

      if (receipt.status) {
        return true;
      }

      const { nextRollupId } = await this.blockchain.getStatus();
      if (nextRollupId > item.rollupId) {
        console.log('Publish failed. Contract changed underfoot.');
        break;
      }

      console.log(`Transaction status failed: ${txHash.toString('hex')}`);
      await this.sleepOrInterrupted(60000);
    }

    return false;
  }

  /**
   * Calling `interrupt` will cause any in progress call to `publishRollup` to return `false` asap.
   * Be warned, the call may return false even if the tx subsequently gets successfully mined.
   * In practice this shouldn't matter, as we'll only ever be calling `interrupt` when we know it's going to fail.
   * A call to `clearInterrupt` is required before you can continue publishing.
   */
  public interrupt() {
    this.interrupted = true;
    this.interruptResolve();
  }

  public clearInterrupt() {
    this.interrupted = false;
  }

  private async sleepOrInterrupted(ms: number) {
    await Promise.race([new Promise(resolve => setTimeout(resolve, ms)), this.interruptPromise]);
  }
}

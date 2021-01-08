import { EthAddress } from 'barretenberg/address';
import { TxHash } from 'barretenberg/rollup_provider';
import { Blockchain } from 'blockchain';
import moment, { Duration } from 'moment';
import { RollupDao } from './entity/rollup';
import { Metrics } from './metrics';
import { RollupDb } from './rollup_db';

interface PublishItem {
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

  constructor(
    private rollupDb: RollupDb,
    private blockchain: Blockchain,
    private publishInterval: Duration,
    private metrics: Metrics,
    private signingAddress?: EthAddress,
  ) {}

  public async publishRollup(rollup: RollupDao) {
    const lastPublished = await this.rollupDb.getSettledRollups(0, true, 1);

    if (lastPublished.length) {
      const lastPublishedAt = lastPublished[0].created;
      const sincePublished = moment().diff(lastPublishedAt, 's');
      if (sincePublished < this.publishInterval.seconds()) {
        const sleepFor = this.publishInterval.seconds() - sincePublished;
        console.log(`Rollup due to be published in ${sleepFor} seconds...`);
        await this.sleepOrInterrupted(sleepFor * 1000);
      }
    }

    while (!this.interrupted) {
      this.interruptPromise = new Promise(resolve => (this.interruptResolve = resolve));

      const proof = rollup.rollupProof.proofData;
      const rollupId = rollup.id;
      const txs = rollup.rollupProof.txs;
      const viewingKeys = txs.map(tx => [tx.viewingKey1, tx.viewingKey2]).flat();
      const signatures = txs.map(tx => tx.signature!).filter(s => !!s);
      const sigIndexes = txs.map((tx, i) => (tx.signature ? i : -1)).filter(i => i >= 0);

      const item = {
        rollupId,
        proof,
        viewingKeys,
        signatures,
        sigIndexes,
      };

      const end = this.metrics.publishTimer();
      const txHash = await this.sendRollupProof(item);
      if (!txHash) {
        break;
      }
      end();

      await this.rollupDb.confirmSent(rollupId, txHash);

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

      console.log(`Transaction status failed: ${txHash}`);
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

  private async sendRollupProof(item: PublishItem) {
    const { proof, signatures, sigIndexes, viewingKeys } = item;
    while (!this.interrupted) {
      try {
        return await this.blockchain.sendRollupProof(proof, signatures, sigIndexes, viewingKeys, this.signingAddress);
      } catch (err) {
        console.log(err.message.slice(0, 200));
        await this.sleepOrInterrupted(60000);
      }
    }
  }

  private async getTransactionReceipt(txHash: TxHash) {
    while (!this.interrupted) {
      try {
        return await this.blockchain.getTransactionReceipt(txHash);
      } catch (err) {
        console.log(err);
        await this.sleepOrInterrupted(60000);
      }
    }
  }

  private async sleepOrInterrupted(ms: number) {
    await Promise.race([new Promise(resolve => setTimeout(resolve, ms)), this.interruptPromise]);
  }
}

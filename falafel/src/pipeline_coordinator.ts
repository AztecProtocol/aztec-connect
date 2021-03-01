import moment from 'moment';
import { RollupCreator } from './rollup_creator';
import { RollupDb } from './rollup_db';
import { TxFeeResolver } from './tx_fee_resolver';
import { RollupAggregator } from './rollup_aggregator';
import { RollupPublisher } from './rollup_publisher';
import { RollupProofDao } from './entity/rollup_proof';
import { TxDao } from './entity/tx';

export class PipelineCoordinator {
  private running = false;
  private runningPromise!: Promise<void>;
  private stopPromise!: Promise<void>;
  private cancel!: () => void;
  private flush = false;
  private innerProofs: RollupProofDao[] = [];
  private txs: TxDao[] = [];

  constructor(
    private rollupCreator: RollupCreator,
    private rollupAggregator: RollupAggregator,
    private rollupPublisher: RollupPublisher,
    private rollupDb: RollupDb,
    private numInnerRollupTxs: number,
    private numOuterRollupProofs: number,
    private feeResolver: TxFeeResolver,
  ) {}

  /**
   * Starts monitoring for txs, and once conditions are met, creates a rollup.
   * Stops monitoring once a rollup has been successfully published or `stop` called.
   */
  public start(nextRollupTime: Date) {
    this.running = true;
    this.flush = false;
    this.stopPromise = new Promise(resolve => (this.cancel = resolve));

    const fn = async () => {
      while (this.running) {
        const remainingTxSlots = this.numInnerRollupTxs * (this.numOuterRollupProofs - this.innerProofs.length);
        const pendingTxs = await this.rollupDb.getPendingTxs(remainingTxSlots);
        const count = pendingTxs.length;

        const ratio = this.feeResolver.computeSurplusRatioFromTxDaos([...this.txs, ...pendingTxs]);
        const feeAdjustedSecondsRemaining = (moment(nextRollupTime).diff(moment()) / 1000) * ratio;
        const feeAdjustedNextRollupTime = moment().add(feeAdjustedSecondsRemaining, 's');

        if (moment().isAfter(feeAdjustedNextRollupTime) && (count || this.innerProofs.length)) {
          this.flush = true;
        }

        if (this.flush || (count >= this.numInnerRollupTxs && this.innerProofs.length < this.numOuterRollupProofs)) {
          const txs = pendingTxs.slice(0, this.numInnerRollupTxs);
          if (txs.length) {
            this.txs = [...this.txs, ...txs];
            const rollupProofDao = await this.rollupCreator.create(txs);
            this.innerProofs.push(rollupProofDao);
          }
        }

        if (!this.flush && this.innerProofs.length < this.numOuterRollupProofs) {
          await this.sleepOrStopped(1000);
          continue;
        }

        const rollupDao = await this.rollupAggregator.aggregateRollupProofs(this.innerProofs);
        await this.rollupPublisher.publishRollup(rollupDao);
        break;
      }

      this.running = false;
    };

    return (this.runningPromise = fn());
  }

  /**
   * Interrupts any current rollup generation, stops monitoring for txs, and blocks until fully stopped.
   */
  public async stop() {
    if (!this.running) {
      return;
    }
    this.running = false;
    this.cancel();
    this.rollupCreator.interrupt();
    this.rollupAggregator.interrupt();
    this.rollupPublisher.interrupt();
    await this.runningPromise;
  }

  public flushTxs() {
    this.flush = true;
  }

  private async sleepOrStopped(ms: number) {
    await Promise.race([new Promise(resolve => setTimeout(resolve, ms)), this.stopPromise]);
  }
}

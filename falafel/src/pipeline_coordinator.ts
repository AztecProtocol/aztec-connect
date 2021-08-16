import moment, { Duration } from 'moment';
import { RollupCreator } from './rollup_creator';
import { RollupDb } from './rollup_db';
import { TxFeeResolver } from './tx_fee_resolver';
import { RollupAggregator } from './rollup_aggregator';
import { RollupPublisher } from './rollup_publisher';
import { RollupProofDao } from './entity/rollup_proof';
import { TxDao } from './entity/tx';
import { RollupDao } from './entity/rollup';

export class PipelineCoordinator {
  private running = false;
  private runningPromise!: Promise<void>;
  private flush = false;
  private innerProofs: RollupProofDao[] = [];
  private txs: TxDao[] = [];
  private lastRollup?: RollupDao;
  private rollupId!: number;
  private txsPublishTime?: moment.Moment;

  constructor(
    private rollupCreator: RollupCreator,
    private rollupAggregator: RollupAggregator,
    private rollupPublisher: RollupPublisher,
    private rollupDb: RollupDb,
    private numInnerRollupTxs: number,
    private numOuterRollupProofs: number,
    private publishInterval: Duration,
    private feeResolver: TxFeeResolver,
  ) {}

  public getNextPublishTime() {
    if (!this.running || !this.txsPublishTime) {
      // No txs, report publish time is in publishInterval seconds (not necessarily true).
      return moment().add(this.publishInterval).toDate();
    }

    return (this.txsPublishTime.isSameOrAfter() ? this.txsPublishTime : moment()).toDate();
  }

  /**
   * Starts monitoring for txs, and once conditions are met, creates a rollup.
   * Stops monitoring once a rollup has been successfully published or `stop` called.
   */
  public start() {
    if (this.running) {
      throw new Error('Pipeline coordinator has started running.');
    }

    this.running = true;
    this.flush = false;

    const fn = async () => {
      await this.reset();

      while (this.running) {
        await this.aggregateAndPublish();
        await new Promise(resolve => setTimeout(resolve, 1000 * +this.running));
      }
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
    this.rollupCreator.interrupt();
    this.rollupAggregator.interrupt();
    this.rollupPublisher.interrupt();
    await this.runningPromise;
  }

  public flushTxs() {
    this.flush = true;
  }

  private async reset() {
    // Erase any outstanding rollups and proofs to release unsettled txs.
    await this.rollupDb.deleteUnsettledRollups();
    await this.rollupDb.deleteOrphanedRollupProofs();
    this.txs = [];
    this.lastRollup = await this.rollupDb.getLastSettledRollup();
    this.rollupId = await this.rollupDb.getNextRollupId();
  }

  private refreshTxsPublishTime(txs: TxDao[]) {
    if (!txs.length) {
      return;
    }

    // Rollup now if
    // - we have a tx, but have not rolled up before.
    // - txs is full.
    if (!this.lastRollup || txs.length >= this.numInnerRollupTxs * this.numOuterRollupProofs) {
      this.txsPublishTime = moment();
      return;
    }

    // We have rolled up before. Rollup in publishInterval seconds from latest rollup.
    // Or at the time no later than all txs's expected publish time.
    const nextRollupTime = moment(this.lastRollup.mined).add(this.publishInterval);
    this.txsPublishTime = txs
      .map(tx => {
        const ratio = this.feeResolver.computeSurplusRatio([tx]);
        return moment(tx.created).add(this.publishInterval.asSeconds() * ratio, 's');
      })
      .reduce((time, txTime) => (time.isBefore(txTime) ? time : txTime), nextRollupTime);
  }

  private async aggregateAndPublish() {
    const remainingTxSlots = this.numInnerRollupTxs * (this.numOuterRollupProofs - this.innerProofs.length);
    const pendingTxs = [...(await this.rollupDb.getPendingTxs(remainingTxSlots))];
    this.refreshTxsPublishTime([...this.txs, ...pendingTxs]);

    const nextRollupTime = this.getNextPublishTime();
    if (moment(nextRollupTime).isSameOrBefore()) {
      this.flush = true;
    }

    while (
      ((this.flush && pendingTxs.length) || pendingTxs.length >= this.numInnerRollupTxs) &&
      this.innerProofs.length < this.numOuterRollupProofs &&
      this.running
    ) {
      const txs = pendingTxs.splice(0, this.numInnerRollupTxs);
      const rollupProofDao = await this.rollupCreator.create(txs);
      this.txs = [...this.txs, ...txs];
      this.innerProofs.push(rollupProofDao);
    }

    if (
      !this.flush ||
      !this.running ||
      // Check this.innerProofs in case:
      // - this.flush is set to true by calling flushTxs()
      // - publishInterval is zero and nextRollupTime is always now
      !this.innerProofs.length
    ) {
      return;
    }

    const rollupDao = await this.rollupAggregator.aggregateRollupProofs(this.innerProofs);
    if (this.running) {
      await this.rollupPublisher.publishRollup(rollupDao);
      this.running = false;
    }
  }
}

import moment from 'moment';
import { Duration } from 'moment';
import { RollupCreator } from './rollup_creator';
import { RollupDb } from './rollup_db';

export class TxAggregator {
  private running = false;
  private runningPromise!: Promise<void>;
  private stopPromise!: Promise<void>;
  private cancel!: () => void;
  private flush = false;
  private count = 0;

  constructor(
    private rollupCreator: RollupCreator,
    private rollupDb: RollupDb,
    private numInnerRollupTxs: number,
    private flushInterval: Duration,
  ) {}

  /**
   * Starts monitoring for txs, and once conditions are met, creates a rollup.
   * Stops monitoring once a rollup has been successfully published or `stop` called.
   */
  public start() {
    this.running = true;
    this.flush = false;
    this.stopPromise = new Promise(resolve => (this.cancel = resolve));

    const fn = async () => {
      while (this.running) {
        this.count = await this.rollupDb.getPendingTxCount();

        if (moment().isAfter(await this.getDeadline()) && this.count > 0) {
          this.flush = true;
        }

        if (this.flush || this.count >= this.numInnerRollupTxs) {
          const txs = await this.rollupDb.getPendingTxs(this.numInnerRollupTxs);
          // If we are past deadline we flush (this.flush == true), but not if we have more pending txs
          // than can fit in a single inner rollup. In this case we want a chance to loop around again
          // to produce another inner rollup.
          const published = await this.rollupCreator.create(txs, this.flush && this.count <= this.numInnerRollupTxs);

          if (published) {
            break;
          }
        }

        await this.sleepOrStopped(1000);
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
    await this.runningPromise;
  }

  public flushTxs() {
    this.flush = true;
  }

  public getPendingTxCount() {
    return this.count;
  }

  private async getDeadline() {
    const lastSettled = await this.rollupDb.getSettledRollups(0, true, 1);
    if (lastSettled.length) {
      const lastCreatedTime = moment(lastSettled[0].created);
      return lastCreatedTime.add(this.flushInterval);
    }
    return moment.unix(0);
  }

  private async sleepOrStopped(ms: number) {
    await Promise.race([new Promise(resolve => setTimeout(resolve, ms)), this.stopPromise]);
  }
}

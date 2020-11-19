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

  constructor(
    private rollupCreator: RollupCreator,
    private rollupDb: RollupDb,
    private rollupSize: number,
    private maxRollupWaitTime: Duration,
    private minRollupInterval: Duration,
  ) {}

  public async init() {
    await this.rollupCreator.init();
  }

  public destroy() {
    this.rollupCreator.destroy();
  }

  /**
   * Starts monitoring for txs, and once conditions are met, creates a rollup.
   */
  public start() {
    this.running = true;

    this.stopPromise = new Promise(resolve => (this.cancel = resolve));

    const fn = async () => {
      while (this.running) {
        const count = await this.rollupDb.getPendingTxCount();

        if (count === 0) {
          await this.sleepOrStopped(1000);
          continue;
        }

        const first = (await this.rollupDb.getPendingTxs(1))[0];
        if (
          this.flush ||
          count >= this.rollupSize ||
          moment(first.created).isBefore(moment().subtract(this.maxRollupWaitTime, 's'))
        ) {
          this.flush = false;
          const txs = await this.rollupDb.getPendingTxs(this.rollupSize);
          await this.rollupCreator.create(txs);

          // Throttle.
          await this.sleepOrStopped(this.minRollupInterval.asMilliseconds());
        }
      }

      this.rollupCreator.clearInterrupt();
    };

    this.runningPromise = fn();
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

  private async sleepOrStopped(ms: number) {
    await Promise.race([new Promise(resolve => setTimeout(resolve, ms)), this.stopPromise]);
  }
}

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
    private txRollupSize: number,
    private flushInterval: Duration,
  ) {}

  /**
   * Starts monitoring for txs, and once conditions are met, creates a rollup.
   * Stops monitoring once a rollup has been successfully published or `stop` called.
   */
  public async start() {
    this.running = true;
    this.flush = false;
    this.rollupCreator.clearInterrupt();
    this.stopPromise = new Promise(resolve => (this.cancel = resolve));

    const fn = async () => {
      while (this.running) {
        const count = await this.rollupDb.getPendingTxCount();

        if (moment().isAfter(await this.getDeadline()) && count > 0) {
          this.flush = true;
        }

        if (this.flush || count >= this.txRollupSize) {
          const txs = await this.rollupDb.getPendingTxs(this.txRollupSize);
          const published = await this.rollupCreator.create(txs, this.flush);

          if (published) {
            break;
          }
        }

        await this.sleepOrStopped(1000);
      }

      this.running = false;
    };

    this.runningPromise = fn().catch(err => {
      console.log('PANIC!');
      console.log(err);
      this.running = false;
    });
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

import moment from 'moment';
import { Duration } from 'moment';
import { RollupDao } from '../entity/rollup';
import { TxDao } from '../entity/tx';
import { TxFeeResolver } from '../tx_fee_resolver';

export class PublishTimeManager {
  private publishTime?: moment.Moment;

  constructor(
    private readonly lastRollup: RollupDao | undefined,
    private readonly numTxs: number,
    private readonly publishInterval: Duration,
    private readonly feeResolver: TxFeeResolver,
  ) {}

  update(txs: TxDao[]) {
    const publicTime = this.refreshPublishTime(txs);
    this.publishTime = publicTime;
    return publicTime;
  }

  getPublishTime() {
    if (!this.publishTime) {
      // No txs, report publish time is in publishInterval seconds (not necessarily true).
      return moment().add(this.publishInterval).toDate();
    }

    return (this.publishTime.isSameOrAfter() ? this.publishTime : moment()).toDate();
  }

  private refreshPublishTime(txs: TxDao[]) {
    if (!txs.length) {
      return;
    }

    // Rollup now if
    // - we have a tx, but have not rolled up before.
    // - txs is full.
    if (!this.lastRollup || txs.length >= this.numTxs) {
      return moment();
    }

    // We have rolled up before. Rollup in publishInterval seconds from latest rollup.
    // Or at the time no later than all txs's expected publish time.
    const nextRollupTime = moment(this.lastRollup.mined).add(this.publishInterval);
    return txs
      .map(tx => {
        const ratio = this.feeResolver.computeSurplusRatio([tx]);
        return moment(tx.created).add(this.publishInterval.asSeconds() * ratio, 's');
      })
      .reduce((time, txTime) => (time.isBefore(txTime) ? time : txTime), nextRollupTime);
  }
}

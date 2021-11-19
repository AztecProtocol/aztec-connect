import moment from 'moment';
import { Duration } from 'moment';
import { TxDao } from '../entity/tx';
import { TxFeeResolver } from '../tx_fee_resolver';

export class PublishTimeManager {
  private publishTime?: moment.Moment;

  constructor(
    private readonly numTxs: number,
    private readonly publishInterval: Duration,
    private readonly feeResolver: TxFeeResolver,
  ) {}

  update(txs: TxDao[]) {
    this.publishTime = this.refreshPublishTime(txs);
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

    // Rollup now if txs is full.
    if (txs.length >= this.numTxs) {
      return moment();
    }

    // Rollup at the earliest tx expected publish time.
    const nextRollupTime = moment().add(this.publishInterval);
    return txs
      .map(tx => {
        const ratio = this.feeResolver.computeSurplusRatio([tx]);
        return moment(tx.created).add(this.publishInterval.asSeconds() * ratio, 's');
      })
      .reduce((time, txTime) => (time.isBefore(txTime) ? time : txTime), nextRollupTime);
  }
}

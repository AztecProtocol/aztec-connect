import moment from 'moment';
import { TxDao } from '../entity/tx';
import { TxFeeResolver } from '../tx_fee_resolver';
import { PublishTimeManager } from './publish_time_manager';

jest.useFakeTimers();

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

describe('PublishTimeManager', () => {
  const numTxs = 8;
  const publishInterval = moment.duration(10, 's');
  let feeResolver: Mockify<TxFeeResolver>;
  let manager: PublishTimeManager;

  const mockTx = (created = moment()) => ({ created: created.toDate() } as TxDao);

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => 1618226000000);

    feeResolver = {
      computeSurplusRatio: jest.fn().mockReturnValue(1),
    } as any;

    manager = new PublishTimeManager(numTxs, publishInterval, feeResolver as any);
  });

  it('publish in publishInterval seconds if there are no txs', () => {
    expect(manager.getPublishTime()).toEqual(moment().add(publishInterval).toDate());
  });

  it('publish immediately if there are enough txs to create a full rollup', () => {
    const txs = [...Array(numTxs)].map(() => mockTx());
    manager.update(txs);
    expect(manager.getPublishTime()).toEqual(moment().toDate());
  });

  it('should never return an earlier date than now', () => {
    manager.update([mockTx(moment().subtract(publishInterval.asSeconds() + 1, 's'))]);
    expect(manager.getPublishTime()).toEqual(moment().toDate());
  });

  it("should publish no later than any tx's expected time", () => {
    manager.update([
      mockTx(moment().subtract(1, 's')),
      mockTx(moment().add(1, 's')),
      mockTx(moment().subtract(3, 's')),
      mockTx(moment().add(4, 's')),
    ]);
    expect(manager.getPublishTime()).toEqual(moment().add(7, 's').toDate());
  });

  it("should consider suplus ratio for tx's expected time", () => {
    feeResolver.computeSurplusRatio.mockImplementationOnce(() => 0.5);
    manager.update([mockTx()]);
    expect(manager.getPublishTime()).toEqual(moment().add(5, 's').toDate());

    feeResolver.computeSurplusRatio.mockImplementationOnce(() => 0);
    manager.update([mockTx()]);
    expect(manager.getPublishTime()).toEqual(moment().toDate());
  });
});

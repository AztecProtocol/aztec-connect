import moment from 'moment';
import { RollupDao } from '../entity/rollup';
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

  const createManager = (prevRollup?: RollupDao) =>
    new PublishTimeManager(prevRollup, numTxs, publishInterval, feeResolver as any);

  const mockRollup = (mined = moment()) => (({ mined } as any) as RollupDao);

  const mockTx = (created = moment()) => ({ created: created.toDate() } as TxDao);

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => 1618226000000);

    feeResolver = {
      computeSurplusRatio: jest.fn().mockReturnValue(1),
    } as any;
  });

  it('publish in publishInterval seconds if there are no txs and previous rollup', () => {
    const manager = createManager();
    expect(manager.getPublishTime()).toEqual(moment().add(publishInterval).toDate());
  });

  it('should publish immediately if there is at least one tx but no previous rollup', () => {
    const manager = createManager();
    manager.update([mockTx()]);
    expect(manager.getPublishTime()).toEqual(moment().toDate());
  });

  it('publish in publishInterval seconds from the latest rollup', () => {
    const mined = moment().subtract(2, 's');
    const manager = createManager(mockRollup(mined));
    manager.update([mockTx()]);
    expect(manager.getPublishTime()).toEqual(moment().add(8, 's').toDate());
  });

  it('should never return an earlier date than now', () => {
    const mined = moment().subtract(11, 's');
    const manager = createManager(mockRollup(mined));
    manager.update([mockTx()]);
    expect(manager.getPublishTime()).toEqual(moment().toDate());
  });

  it('publish immediately if there are enough txs to create a full rollup', () => {
    const manager = createManager(mockRollup());
    const txs = [...Array(numTxs)].map(() => mockTx());
    manager.update(txs);
    expect(manager.getPublishTime()).toEqual(moment().toDate());
  });

  it("should publish no later than any tx's expected time", () => {
    const manager = createManager(mockRollup());
    manager.update([
      mockTx(moment().subtract(1, 's')),
      mockTx(moment().add(1, 's')),
      mockTx(moment().subtract(3, 's')),
      mockTx(moment().add(4, 's')),
    ]);
    expect(manager.getPublishTime()).toEqual(moment().add(7, 's').toDate());
  });

  it("should consider suplus ratio for tx's expected time", () => {
    const manager = createManager(mockRollup());

    feeResolver.computeSurplusRatio.mockImplementationOnce(() => 0.5);
    manager.update([mockTx()]);
    expect(manager.getPublishTime()).toEqual(moment().add(5, 's').toDate());

    feeResolver.computeSurplusRatio.mockImplementationOnce(() => 0);
    manager.update([mockTx()]);
    expect(manager.getPublishTime()).toEqual(moment().toDate());
  });
});

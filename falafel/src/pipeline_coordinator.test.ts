import moment from 'moment';
import { TxDao } from './entity/tx';
import { PipelineCoordinator } from './pipeline_coordinator';
import { RollupAggregator } from './rollup_aggregator';
import { RollupCreator } from './rollup_creator';
import { RollupDb } from './rollup_db';
import { RollupPublisher } from './rollup_publisher';
import { TxFeeResolver } from './tx_fee_resolver';

jest.useFakeTimers();

describe('pipeline_coordinator', () => {
  const numInnerRollupTxs = 2;
  const numOuterRollupProofs = 4;
  const publishInterval = moment.duration(10, 's');
  let rollupCreator: RollupCreator;
  let rollupAggregator: RollupAggregator;
  let rollupPublisher: RollupPublisher;
  let rollupDb: RollupDb;
  let feeResolver: TxFeeResolver;
  let coordinator: PipelineCoordinator;
  let dateSpy: jest.SpyInstance<number>;

  beforeEach(() => {
    dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => 1618226064000);

    rollupCreator = ({
      create: jest.fn().mockResolvedValue(Buffer.alloc(0)),
      interrupt: jest.fn(),
    } as any) as RollupCreator;

    rollupAggregator = ({
      aggregateRollupProofs: jest.fn().mockResolvedValue(Buffer.alloc(0)),
      interrupt: jest.fn(),
    } as any) as RollupAggregator;

    rollupPublisher = ({
      publishRollup: jest.fn(),
      interrupt: jest.fn(),
    } as any) as RollupPublisher;

    rollupDb = ({
      deleteUnsettledRollups: jest.fn(),
      deleteOrphanedRollupProofs: jest.fn(),
      getNextRollupId: jest.fn().mockResolvedValue(0),
      getLastSettledRollup: jest.fn().mockResolvedValue(undefined),
      getPendingTxs: jest.fn().mockResolvedValue([]),
    } as any) as RollupDb;

    feeResolver = ({
      computeSurplusRatio: jest.fn().mockReturnValue(1),
    } as any) as TxFeeResolver;

    coordinator = new PipelineCoordinator(
      rollupCreator,
      rollupAggregator,
      rollupPublisher,
      rollupDb,
      numInnerRollupTxs,
      numOuterRollupProofs,
      publishInterval,
      feeResolver,
    );
  });

  afterEach(() => {
    dateSpy.mockRestore();
  });

  describe('start and stop', () => {
    it('should reset data and trigger aggregateAndPublish()', async () => {
      const reset = jest.spyOn(coordinator as any, 'reset').mockImplementation(jest.fn());
      let resolveAggregateAndPublish: () => void;
      const aggregateAndPublishPromise = new Promise<void>(resolve => (resolveAggregateAndPublish = resolve));
      const aggregateAndPublish = jest.spyOn(coordinator as any, 'aggregateAndPublish').mockImplementation(async () => {
        // reset() should have been called before aggregateAndPublish()
        expect(reset).toHaveBeenCalledTimes(1);
        resolveAggregateAndPublish();
      });
      coordinator.start();
      await aggregateAndPublishPromise;
      expect(aggregateAndPublish).toHaveBeenCalledTimes(1);
    });

    it('cannot start when it is already started', () => {
      coordinator.start();
      expect(() => coordinator.start()).toThrow();
    });
  });

  describe('getNextPublishTime', () => {
    const mockLastRollup = (lastRollupTime = moment()) => {
      (coordinator as any).lastRollup = { mined: lastRollupTime };
    };

    const mockTx = (created = moment()) => ({ created: created.toDate() } as TxDao);

    const refreshTxsPublishTime = (txs: TxDao[]) => (coordinator as any).refreshTxsPublishTime(txs);

    beforeEach(() => {
      (coordinator as any).running = true;
    });

    it('should publish in publishInterval seconds if there are no txs and previous rollup', () => {
      expect(coordinator.getNextPublishTime()).toEqual(moment().add(publishInterval).toDate());
      refreshTxsPublishTime([]);
      expect(coordinator.getNextPublishTime()).toEqual(moment().add(publishInterval).toDate());
    });

    it('should publish immediately if we have some txs but have not rolluped up before', () => {
      refreshTxsPublishTime([mockTx()]);
      expect(coordinator.getNextPublishTime()).toEqual(moment().toDate());
    });

    it('should publish in publishInterval seconds if not running', () => {
      refreshTxsPublishTime([mockTx()]);
      (coordinator as any).running = false;
      expect(coordinator.getNextPublishTime()).toEqual(moment().add(publishInterval).toDate());
    });

    it('should wait for publishInterval seconds from the latest rollup time', () => {
      mockLastRollup(moment().subtract(4, 's'));
      refreshTxsPublishTime([mockTx()]);
      expect(coordinator.getNextPublishTime()).toEqual(moment().add(6, 's').toDate());
    });

    it('should publish immediately if there are enough txs to create a full rollup', () => {
      const fullTxs = Array(numInnerRollupTxs * numOuterRollupProofs).fill(mockTx());
      mockLastRollup(moment().subtract(4, 's'));

      refreshTxsPublishTime(fullTxs.slice(1));
      expect(coordinator.getNextPublishTime()).toEqual(moment().add(6, 's').toDate());

      refreshTxsPublishTime(fullTxs);
      expect(coordinator.getNextPublishTime()).toEqual(moment().toDate());
    });

    it('should never return an earlier date than now', () => {
      (coordinator as any).txsPublishTime = moment().subtract(1, 's');
      expect(coordinator.getNextPublishTime()).toEqual(moment().toDate());
    });

    it("should publish no later than any tx's expected time", () => {
      mockLastRollup(moment().subtract(1, 's'));
      refreshTxsPublishTime([mockTx(moment())]);
      expect(coordinator.getNextPublishTime()).toEqual(moment().add(9, 's').toDate());

      refreshTxsPublishTime([mockTx(moment().subtract(3, 's'))]);
      expect(coordinator.getNextPublishTime()).toEqual(moment().add(7, 's').toDate());

      refreshTxsPublishTime([mockTx(moment().subtract(3, 's')), mockTx(moment().subtract(8, 's'))]);
      expect(coordinator.getNextPublishTime()).toEqual(moment().add(2, 's').toDate());
    });

    it("should consider suplus ratio for tx's expected time", () => {
      mockLastRollup(moment().subtract(2, 's'));
      refreshTxsPublishTime([mockTx(moment())]);
      expect(coordinator.getNextPublishTime()).toEqual(moment().add(8, 's').toDate());

      const computeSurplusRatioSpy = jest.spyOn(feeResolver, 'computeSurplusRatio').mockImplementation(() => 0.5);
      refreshTxsPublishTime([mockTx(moment())]);
      expect(coordinator.getNextPublishTime()).toEqual(moment().add(5, 's').toDate());

      refreshTxsPublishTime([mockTx(moment().subtract(4, 's'))]);
      expect(coordinator.getNextPublishTime()).toEqual(moment().add(1, 's').toDate());

      computeSurplusRatioSpy.mockImplementation(() => 0);
      refreshTxsPublishTime([mockTx(moment().subtract(4, 's'))]);
      expect(coordinator.getNextPublishTime()).toEqual(moment().toDate());

      refreshTxsPublishTime([mockTx(moment().add(3, 's'))]);
      expect(coordinator.getNextPublishTime()).toEqual(moment().add(3, 's').toDate());
    });
  });

  describe('aggregate and publish proofs', () => {
    let createProof: jest.SpyInstance<any>;
    let aggregateRollupProofs: jest.SpyInstance<any>;
    let publishRollup: jest.SpyInstance<any>;

    const processedTxs = (): number => (coordinator as any).txs.length;
    const processedTxIds = (): number => (coordinator as any).txs.map((tx: TxDao) => tx.id);
    const innerProofs = (): number => (coordinator as any).innerProofs.length;
    const isRunning = (): boolean => (coordinator as any).running;

    const mockLastRollup = (lastRollupTime = moment()) => {
      (coordinator as any).lastRollup = { mined: lastRollupTime };
    };

    const mockProcessedTxs = (numberOfTxs = 1) => {
      (coordinator as any).innerProofs.push(...Array(Math.ceil(numberOfTxs / numInnerRollupTxs)).fill({}));
      (coordinator as any).txs = Array(numberOfTxs)
        .fill(0)
        .map((_, id) => (({ id } as any) as TxDao));
    };

    const mockPendingTxs = (numberOfTxs = 1, offset = 0) => {
      jest.spyOn(rollupDb, 'getPendingTxs').mockImplementation(async () =>
        Array(numberOfTxs)
          .fill(0)
          .map((_, i) => (({ id: offset + i } as any) as TxDao)),
      );
    };

    const mockInnerProofs = (numberOfProofs = 1) => {
      (coordinator as any).innerProofs = Array(numberOfProofs).fill({});
    };

    const aggregateAndPublish = async () => (coordinator as any).aggregateAndPublish();

    beforeEach(() => {
      createProof = jest.spyOn(rollupCreator, 'create');
      aggregateRollupProofs = jest.spyOn(rollupAggregator, 'aggregateRollupProofs');
      publishRollup = jest.spyOn(rollupPublisher, 'publishRollup');

      mockLastRollup(moment().subtract(publishInterval.asSeconds() - 1, 's'));

      (coordinator as any).running = true;
    });

    it('do nothing if not enough pending txs', async () => {
      mockPendingTxs(1);

      await aggregateAndPublish();

      expect(processedTxs()).toBe(0);
      expect(innerProofs()).toBe(0);

      expect(createProof).toHaveBeenCalledTimes(0);
      expect(aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(publishRollup).toHaveBeenCalledTimes(0);
      expect(isRunning()).toBe(true);
    });

    it('create a rollup proof if has enough pending txs', async () => {
      mockProcessedTxs(4);
      mockPendingTxs(2, 4);

      await aggregateAndPublish();

      expect(processedTxs()).toBe(6);
      expect(processedTxIds()).toEqual([0, 1, 2, 3, 4, 5]);
      expect(innerProofs()).toBe(3);

      expect(createProof).toHaveBeenCalledTimes(1);
      expect(aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(publishRollup).toHaveBeenCalledTimes(0);
      expect(isRunning()).toBe(true);

      mockPendingTxs(2, 6);

      await aggregateAndPublish();

      expect(processedTxs()).toBe(8);
      expect(processedTxIds()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
      expect(innerProofs()).toBe(4);

      expect(createProof).toHaveBeenCalledTimes(2);
      expect(aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(publishRollup).toHaveBeenCalledTimes(1);
      expect(isRunning()).toBe(false);
    });

    it('flush all pending txs if is time to publish', async () => {
      mockPendingTxs(1);
      mockLastRollup(moment().subtract(publishInterval));

      await aggregateAndPublish();

      expect(processedTxs()).toBe(1);
      expect(innerProofs()).toBe(1);

      expect(createProof).toHaveBeenCalledTimes(1);
      expect(aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(publishRollup).toHaveBeenCalledTimes(1);
      expect(isRunning()).toBe(false);
    });

    it('flush all pending txs if publish time has passed', async () => {
      mockPendingTxs(1);
      // getNextPublishTime() always returns a time not earlier than now. But it could be by the time we check it in aggregateAndPublish().
      jest.spyOn(coordinator, 'getNextPublishTime').mockImplementation(() => moment().subtract(1, 's').toDate());

      await aggregateAndPublish();

      expect(processedTxs()).toBe(1);
      expect(innerProofs()).toBe(1);

      expect(createProof).toHaveBeenCalledTimes(1);
      expect(aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(publishRollup).toHaveBeenCalledTimes(1);
      expect(isRunning()).toBe(false);
    });

    it('do nothing if is time to rollup but has no txs', async () => {
      mockLastRollup(moment().subtract(publishInterval));

      await aggregateAndPublish();

      expect(processedTxs()).toBe(0);
      expect(innerProofs()).toBe(0);

      expect(createProof).toHaveBeenCalledTimes(0);
      expect(aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(publishRollup).toHaveBeenCalledTimes(0);
      expect(isRunning()).toBe(true);
    });

    it('roll up as many full inner proofs as possible', async () => {
      mockPendingTxs(7);

      await aggregateAndPublish();

      expect(processedTxs()).toBe(6);
      expect(processedTxIds()).toEqual([0, 1, 2, 3, 4, 5]);
      expect(innerProofs()).toBe(3);

      expect(createProof).toHaveBeenCalledTimes(3);
      expect(aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(publishRollup).toHaveBeenCalledTimes(0);
      expect(isRunning()).toBe(true);
    });

    it('roll up as many proofs as possible when it is time to publish', async () => {
      mockPendingTxs(7);
      mockLastRollup(moment().subtract(publishInterval));

      await aggregateAndPublish();

      expect(processedTxs()).toBe(7);
      expect(processedTxIds()).toEqual([0, 1, 2, 3, 4, 5, 6]);
      expect(innerProofs()).toBe(4);

      expect(createProof).toHaveBeenCalledTimes(4);
      expect(aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(publishRollup).toHaveBeenCalledTimes(1);
      expect(isRunning()).toBe(false);
    });

    it('will not process new incoming txs while it is creating inner proofs', async () => {
      mockPendingTxs(5);
      jest.spyOn(rollupCreator, 'create').mockImplementation((() => {
        // Add one more pending tx while creating an inner proof
        mockPendingTxs(1, (coordinator as any).txs.length + numInnerRollupTxs);
        return Buffer.alloc(0);
      }) as any);

      await aggregateAndPublish();

      expect(processedTxIds()).toEqual([0, 1, 2, 3]);
      expect(innerProofs()).toBe(2);

      expect(createProof).toHaveBeenCalledTimes(2);
      expect(aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(publishRollup).toHaveBeenCalledTimes(0);
      expect(isRunning()).toBe(true);

      mockLastRollup(moment().subtract(publishInterval));
      jest.spyOn(rollupCreator, 'create').mockImplementation((() => {
        // Add 3 more pending txs while creating an inner proof
        mockPendingTxs(3, (coordinator as any).txs.length + numInnerRollupTxs);
        return Buffer.alloc(0);
      }) as any);

      await aggregateAndPublish();

      expect(processedTxIds()).toEqual([0, 1, 2, 3, 4]);
      expect(innerProofs()).toBe(3);

      expect(createProof).toHaveBeenCalledTimes(3);
      expect(aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(publishRollup).toHaveBeenCalledTimes(1);
      expect(isRunning()).toBe(false);
    });

    it('will not fetch more pending txs than it should', async () => {
      const getPendingTxs = jest.spyOn(rollupDb, 'getPendingTxs').mockImplementation(async () => []);

      await aggregateAndPublish();
      expect(getPendingTxs).toHaveBeenLastCalledWith(8);

      mockInnerProofs(1);
      await aggregateAndPublish();
      expect(getPendingTxs).toHaveBeenLastCalledWith(6);

      mockInnerProofs(4);
      await aggregateAndPublish();
      expect(getPendingTxs).toHaveBeenLastCalledWith(0);
    });

    it('will create and publish proof if flush is set to true ', async () => {
      mockPendingTxs(1);
      coordinator.flushTxs();

      await aggregateAndPublish();

      expect(processedTxs()).toBe(1);
      expect(innerProofs()).toBe(1);

      expect(createProof).toHaveBeenCalledTimes(1);
      expect(aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(publishRollup).toHaveBeenCalledTimes(1);
      expect(isRunning()).toBe(false);
    });

    it('will not aggregate proofs when flush is true but there are no inner proofs ', async () => {
      coordinator.flushTxs();

      await aggregateAndPublish();

      expect(createProof).toHaveBeenCalledTimes(0);
      expect(aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(publishRollup).toHaveBeenCalledTimes(0);
      expect(isRunning()).toBe(true);
    });

    it('will not continue to create proofs if it has stopped running', async () => {
      mockPendingTxs(10);
      coordinator.flushTxs();

      jest.spyOn(rollupCreator, 'create').mockImplementation((async () => {
        await coordinator.stop();
      }) as any);

      await aggregateAndPublish();

      expect(createProof).toHaveBeenCalledTimes(1);
      expect(aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(publishRollup).toHaveBeenCalledTimes(0);
      expect(isRunning()).toBe(false);
    });

    it('will not aggregating proofs if it has stopped running while creating rollup proof', async () => {
      mockPendingTxs(1);
      coordinator.flushTxs();

      jest.spyOn(rollupCreator, 'create').mockImplementation((async () => {
        await coordinator.stop();
      }) as any);

      await aggregateAndPublish();

      expect(createProof).toHaveBeenCalledTimes(1);
      expect(aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(publishRollup).toHaveBeenCalledTimes(0);
      expect(isRunning()).toBe(false);
    });

    it('will not publish if it has stopped running while aggregating rollup proofs', async () => {
      mockPendingTxs(1);
      coordinator.flushTxs();

      jest.spyOn(rollupAggregator, 'aggregateRollupProofs').mockImplementation((async () => {
        await coordinator.stop();
      }) as any);

      await aggregateAndPublish();

      expect(createProof).toHaveBeenCalledTimes(1);
      expect(aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(publishRollup).toHaveBeenCalledTimes(0);
      expect(isRunning()).toBe(false);
    });
  });
});

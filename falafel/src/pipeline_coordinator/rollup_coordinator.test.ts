import { AssetId } from '@aztec/barretenberg/asset';
import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { randomBytes } from 'crypto';
import moment from 'moment';
import { TxDao } from '../entity/tx';
import { RollupAggregator } from '../rollup_aggregator';
import { RollupCreator } from '../rollup_creator';
import { RollupPublisher } from '../rollup_publisher';
import { PublishTimeManager } from './publish_time_manager';
import { RollupCoordinator } from './rollup_coordinator';

jest.useFakeTimers();

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

const randomInt = (to = 2 ** 32 - 1) => Math.floor(Math.random() * (to + 1));

describe('rollup_coordinator', () => {
  const numInnerRollupTxs = 2;
  const numOuterRollupProofs = 4;
  const oldDefiRoot = randomBytes(32);
  const oldDefiPath = new HashPath([]);
  const defiInteractionNotes: DefiInteractionNote[] = [];
  let publishTimeManager: Mockify<PublishTimeManager>;
  let rollupCreator: Mockify<RollupCreator>;
  let rollupAggregator: Mockify<RollupAggregator>;
  let rollupPublisher: Mockify<RollupPublisher>;
  let coordinator: RollupCoordinator;

  const txTypeToProofId = (txType: TxType) => (txType < TxType.WITHDRAW_TO_CONTRACT ? txType + 1 : txType);

  const mockTx = (
    id: number,
    {
      txType = TxType.TRANSFER,
      txFeeAssetId = AssetId.ETH,
      bridgeId = new BridgeId(randomInt(), 1, 0, 1, 0, false, false, 0),
      noteCommitment1 = randomBytes(32),
      noteCommitment2 = randomBytes(32),
      backwardLink = Buffer.alloc(32),
      allowChain = numToUInt32BE(2, 32),
    } = {},
  ) =>
    (({
      id,
      txType,
      proofData: Buffer.concat([
        numToUInt32BE(txTypeToProofId(txType), 32),
        noteCommitment1,
        noteCommitment2,
        randomBytes(7 * 32),
        numToUInt32BE(txFeeAssetId, 32),
        bridgeId.toBuffer(),
        randomBytes(3 * 32),
        backwardLink,
        allowChain,
      ]),
    } as any) as TxDao);

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => 1618226000000);

    publishTimeManager = {
      update: jest.fn(),
      getPublishTime: jest.fn().mockImplementation(() => moment().add(1, 's')),
    };

    rollupCreator = {
      create: jest.fn().mockResolvedValue(Buffer.alloc(0)),
      interrupt: jest.fn(),
    };

    rollupAggregator = {
      aggregateRollupProofs: jest.fn().mockResolvedValue(Buffer.alloc(0)),
      interrupt: jest.fn(),
    };

    rollupPublisher = {
      publishRollup: jest.fn().mockResolvedValue(true),
      interrupt: jest.fn(),
    };

    coordinator = new RollupCoordinator(
      publishTimeManager as any,
      rollupCreator as any,
      rollupAggregator as any,
      rollupPublisher as any,
      numInnerRollupTxs,
      numOuterRollupProofs,
      oldDefiRoot,
      oldDefiPath,
      defiInteractionNotes,
    );
  });

  describe('publish time is in the future', () => {
    it('should do nothing if txs is empty', async () => {
      const published = await coordinator.processPendingTxs([]);
      expect(published).toBe(false);
      expect(coordinator.processedTxs).toEqual([]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should do nothing if txs are not enough to create an inner proof', async () => {
      const pendingTxs = [...Array(numInnerRollupTxs - 1)].map((_, i) => mockTx(i));
      const published = await coordinator.processPendingTxs(pendingTxs);
      expect(published).toBe(false);
      expect(coordinator.processedTxs).toEqual([]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should create inner proofs but not publish if outer rollup is not full', async () => {
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs - 1)].map((_, i) => mockTx(i));
      const published = await coordinator.processPendingTxs(pendingTxs);
      expect(published).toBe(false);
      expect(coordinator.processedTxs).toEqual(pendingTxs.slice(0, numInnerRollupTxs * (numOuterRollupProofs - 1)));
      expect(rollupCreator.create).toHaveBeenCalledTimes(numOuterRollupProofs - 1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should aggregate and publish if txs is full', async () => {
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => mockTx(i));
      const published = await coordinator.processPendingTxs(pendingTxs);
      expect(published).toBe(true);
      expect(coordinator.processedTxs).toEqual(pendingTxs);
      expect(rollupCreator.create).toHaveBeenCalledTimes(numOuterRollupProofs);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should update publish time with pending txs', async () => {
      const pendingTxs = [...Array(numInnerRollupTxs)].map((_, i) => mockTx(i));
      const published = await coordinator.processPendingTxs(pendingTxs);
      expect(published).toBe(false);
      expect(publishTimeManager.update).toHaveBeenCalledTimes(1);
      expect(publishTimeManager.update).toHaveBeenCalledWith(pendingTxs);
    });

    it('should do nothing with new txs if it has successfully published a rollup', async () => {
      const numTxs = numInnerRollupTxs * numOuterRollupProofs;
      {
        const pendingTxs = [...Array(numTxs)].map((_, i) => mockTx(i));
        const published = await coordinator.processPendingTxs(pendingTxs);
        expect(published).toBe(true);
        expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      }
      {
        const pendingTxs = [...Array(numTxs)].map((_, i) => mockTx(i + numTxs));
        const published = await coordinator.processPendingTxs(pendingTxs);
        expect(published).toBe(false);
        expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('publish time is now', () => {
    it('should do nothing if txs is empty', async () => {
      publishTimeManager.getPublishTime.mockImplementation(() => moment());
      const published = await coordinator.processPendingTxs([]);
      expect(published).toBe(false);
      expect(coordinator.processedTxs).toEqual([]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should aggregate and publish all txs', async () => {
      publishTimeManager.getPublishTime.mockImplementation(() => moment());
      const pendingTxs = [mockTx(0)];
      const published = await coordinator.processPendingTxs(pendingTxs);
      expect(published).toBe(true);
      expect(coordinator.processedTxs).toEqual(pendingTxs);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should aggregate as many inner proofs as possible and publish', async () => {
      publishTimeManager.getPublishTime.mockImplementation(() => moment());
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs - 1)].map((_, i) => mockTx(i));
      const published = await coordinator.processPendingTxs(pendingTxs);
      expect(published).toBe(true);
      expect(coordinator.processedTxs).toEqual(pendingTxs);
      expect(rollupCreator.create).toHaveBeenCalledTimes(numOuterRollupProofs);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should aggregate all txs and publish if publish time is before now', async () => {
      publishTimeManager.getPublishTime.mockImplementation(() => moment().subtract(1, 's'));
      const pendingTxs = [...Array(numInnerRollupTxs - 1)].map((_, i) => mockTx(i));
      const published = await coordinator.processPendingTxs(pendingTxs);
      expect(published).toBe(true);
      expect(coordinator.processedTxs).toEqual(pendingTxs);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });
  });

  describe('picking txs to rollup', () => {
    it('will not rollup defi deposit proofs with more than the allowed distinct bridge ids', async () => {
      const mockDefiBridgeTx = (id: number, bridgeId: BridgeId) =>
        mockTx(id, {
          txType: TxType.DEFI_DEPOSIT,
          txFeeAssetId: bridgeId.inputAssetId,
          bridgeId,
        });

      const bridgeIds = Array(6)
        .fill(0)
        .map(() => new BridgeId(randomInt(), 1, 1, 0, 0, true, false, 0));
      const pendingTxs = [
        mockDefiBridgeTx(0, bridgeIds[0]),
        mockDefiBridgeTx(1, bridgeIds[1]),
        mockTx(2),
        mockDefiBridgeTx(3, bridgeIds[2]),
        mockDefiBridgeTx(4, bridgeIds[3]),
        mockDefiBridgeTx(5, bridgeIds[4]),
        mockDefiBridgeTx(6, bridgeIds[5]),
        mockTx(7),
        mockDefiBridgeTx(8, bridgeIds[4]),
        mockDefiBridgeTx(9, bridgeIds[3]),
        mockDefiBridgeTx(10, bridgeIds[5]),
        mockTx(11),
      ];
      const published = await coordinator.processPendingTxs(pendingTxs);
      expect(published).toBe(true);
      expect(coordinator.processedTxs).toEqual([
        pendingTxs[0],
        pendingTxs[1],
        pendingTxs[2],
        pendingTxs[3],
        pendingTxs[4],
        pendingTxs[7],
        pendingTxs[9],
        pendingTxs[11],
      ]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(4);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('will rollup defi claim proofs first', async () => {
      const pendingTxs = [
        mockTx(0, { txType: TxType.DEPOSIT }),
        mockTx(1, { txType: TxType.ACCOUNT }),
        mockTx(2, { txType: TxType.DEFI_DEPOSIT }),
        mockTx(3, { txType: TxType.DEFI_CLAIM }),
        mockTx(4, { txType: TxType.WITHDRAW_TO_CONTRACT }),
        mockTx(5, { txType: TxType.DEFI_CLAIM }),
        mockTx(6, { txType: TxType.TRANSFER }),
        mockTx(7, { txType: TxType.WITHDRAW_TO_WALLET }),
        mockTx(8, { txType: TxType.DEPOSIT }),
        mockTx(9, { txType: TxType.DEFI_DEPOSIT }),
        mockTx(10, { txType: TxType.DEFI_CLAIM }),
      ];
      const published = await coordinator.processPendingTxs(pendingTxs);
      expect(published).toBe(true);
      expect(coordinator.processedTxs).toEqual([
        pendingTxs[3],
        pendingTxs[5],
        pendingTxs[10],
        pendingTxs[0],
        pendingTxs[1],
        pendingTxs[2],
        pendingTxs[4],
        pendingTxs[6],
      ]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(4);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });
  });

  describe('aggregating linked txs', () => {
    const numInnerRollupTxs = 8;
    const numOuterRollupProofs = 2;

    beforeEach(() => {
      coordinator = new RollupCoordinator(
        publishTimeManager as any,
        rollupCreator as any,
        rollupAggregator as any,
        rollupPublisher as any,
        numInnerRollupTxs,
        numOuterRollupProofs,
        oldDefiRoot,
        oldDefiPath,
        defiInteractionNotes,
      );
    });

    it('should put chained txs in an inner rollup together', async () => {
      const chainedTxsA = [...Array(3)]
        .map(() => randomBytes(32))
        .map((noteCommitment2, i, commitments) =>
          mockTx(i, {
            noteCommitment2,
            backwardLink: i ? commitments[i - 1] : randomBytes(32),
          }),
        );
      const chainedTxsB = [...Array(4)]
        .map(() => randomBytes(32))
        .map((noteCommitment2, i, commitments) =>
          mockTx(i, {
            noteCommitment2,
            backwardLink: i ? commitments[i - 1] : randomBytes(32),
          }),
        );
      const normalTxs = [...Array(3)].map((_, i) => mockTx(i + chainedTxsA.length + chainedTxsB.length));
      const pendingTxs = [
        chainedTxsA[0],
        normalTxs[0],
        chainedTxsB[0],
        normalTxs[1],
        chainedTxsB[1],
        chainedTxsA[1],
        normalTxs[2],
        chainedTxsB[2],
        chainedTxsA[2],
        chainedTxsB[3],
      ];
      const published = await coordinator.processPendingTxs(pendingTxs);
      expect(published).toBe(false);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupCreator.create).toHaveBeenCalledWith([
        chainedTxsA[0],
        chainedTxsA[1],
        normalTxs[0],
        chainedTxsB[0],
        chainedTxsB[1],
        chainedTxsB[2],
        normalTxs[1],
        normalTxs[2],
      ]);
    });

    it('should break a chain if they cannot be in the same inner rollup', async () => {
      const bridgeIds = [...Array(5)].map(() => new BridgeId(randomInt(), 1, 0, 1, 0, false, false, 0));

      // Create 4 defi deposit txs with different bridge ids.
      const defiTxs = bridgeIds.slice(0, 4).map((bridgeId, i) =>
        mockTx(i, {
          txType: TxType.DEFI_DEPOSIT,
          bridgeId,
        }),
      );

      // Create a chain with 5 txs. The 3rd one is a defi deposit tx.
      const commitments = [...Array(5)].map(() => randomBytes(32));
      const chainedTxs = commitments.slice(0, 2).map((noteCommitment2, i) =>
        mockTx(i + 4, {
          noteCommitment2,
          backwardLink: i ? commitments[i - 1] : Buffer.alloc(32),
        }),
      );
      chainedTxs.push(
        mockTx(6, {
          txType: TxType.DEFI_DEPOSIT,
          bridgeId: bridgeIds[4],
          noteCommitment2: commitments[2],
          backwardLink: commitments[1],
        }),
      );
      commitments.slice(3).forEach((noteCommitment2, i) => {
        chainedTxs.push(
          mockTx(i + 7, {
            noteCommitment2,
            backwardLink: commitments[2 + i],
          }),
        );
      });

      // Create 3 deposit txs.
      const normalTxs = [...Array(3)].map((_, i) => mockTx(i + 9));

      const pendingTxs = [
        defiTxs[0],
        defiTxs[1],
        chainedTxs[0],
        defiTxs[2],
        chainedTxs[1],
        defiTxs[3],
        chainedTxs[2],
        chainedTxs[3],
        normalTxs[0],
        chainedTxs[4],
        normalTxs[1],
        normalTxs[2],
      ];
      const published = await coordinator.processPendingTxs(pendingTxs);
      expect(published).toBe(false);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupCreator.create).toHaveBeenCalledWith([
        defiTxs[0],
        defiTxs[1],
        chainedTxs[0],
        chainedTxs[1],
        defiTxs[2],
        defiTxs[3],
        normalTxs[0],
        normalTxs[1],
      ]);
    });
  });

  describe('flushTxs', () => {
    const flush = true;

    it('should do nothing if txs is empty', async () => {
      const published = await coordinator.processPendingTxs([], flush);
      expect(published).toBe(false);
      expect(coordinator.processedTxs).toEqual([]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should aggregate and publish all txs', async () => {
      const pendingTxs = [mockTx(0)];
      const published = await coordinator.processPendingTxs(pendingTxs, flush);
      expect(published).toBe(true);
      expect(coordinator.processedTxs).toEqual(pendingTxs);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });
  });

  describe('interrupt', () => {
    it('should interrupt all helpers', () => {
      coordinator.interrupt();
      expect(rollupCreator.interrupt).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.interrupt).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.interrupt).toHaveBeenCalledTimes(1);
    });

    it('should not aggregate and publish if rollupCreator is interrupted', async () => {
      rollupCreator.create.mockImplementation(() => {
        throw new Error();
      });
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => mockTx(i));
      const published = await coordinator.processPendingTxs(pendingTxs);
      expect(published).toBe(false);
      expect(coordinator.processedTxs).toEqual([]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should not publish if rollupAggregator is interrupted', async () => {
      rollupAggregator.aggregateRollupProofs.mockImplementation(() => {
        throw new Error();
      });
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => mockTx(i));
      const published = await coordinator.processPendingTxs(pendingTxs);
      expect(published).toBe(false);
      expect(coordinator.processedTxs).toEqual(pendingTxs);
      expect(rollupCreator.create).toHaveBeenCalledTimes(numOuterRollupProofs);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should not throw if rollupPublisher is interrupted', async () => {
      rollupPublisher.publishRollup.mockImplementation(() => {
        throw new Error();
      });
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => mockTx(i));
      const published = await coordinator.processPendingTxs(pendingTxs);
      expect(published).toBe(false);
      expect(coordinator.processedTxs).toEqual(pendingTxs);
      expect(rollupCreator.create).toHaveBeenCalledTimes(numOuterRollupProofs);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });
  });
});

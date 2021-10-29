import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofData } from '@aztec/barretenberg/client_proofs';
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
    txType = TxType.DEPOSIT,
    txFeeAssetId = AssetId.ETH,
    bridgeId = new BridgeId(randomInt(), 1, 0, 1, 0, false, false, 0),
  ) =>
    (({
      id,
      txType,
      proofData: Buffer.concat([
        numToUInt32BE(txTypeToProofId(txType), 32),
        randomBytes(9 * 32),
        numToUInt32BE(txFeeAssetId, 32),
        bridgeId.toBuffer(),
        randomBytes((ProofData.NUM_PUBLIC_INPUTS - 12) * 32),
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
        mockTx(id, TxType.DEFI_DEPOSIT, bridgeId.inputAssetId, bridgeId);

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
        mockTx(0, TxType.DEPOSIT),
        mockTx(1, TxType.ACCOUNT),
        mockTx(2, TxType.DEFI_DEPOSIT),
        mockTx(3, TxType.DEFI_CLAIM),
        mockTx(4, TxType.WITHDRAW_TO_CONTRACT),
        mockTx(5, TxType.DEFI_CLAIM),
        mockTx(6, TxType.TRANSFER),
        mockTx(7, TxType.WITHDRAW_TO_WALLET),
        mockTx(8, TxType.DEPOSIT),
        mockTx(9, TxType.DEFI_DEPOSIT),
        mockTx(10, TxType.DEFI_CLAIM),
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

  describe('flushTxs', () => {
    it('should do nothing if txs is empty', async () => {
      coordinator.flushTxs();
      const published = await coordinator.processPendingTxs([]);
      expect(published).toBe(false);
      expect(coordinator.processedTxs).toEqual([]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should aggregate and publish all txs', async () => {
      coordinator.flushTxs();
      const pendingTxs = [mockTx(0)];
      const published = await coordinator.processPendingTxs(pendingTxs);
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

    it('should not aggregate any txs', async () => {
      coordinator.interrupt();
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => mockTx(i));
      const published = await coordinator.processPendingTxs(pendingTxs);
      expect(published).toBe(false);
      expect(coordinator.processedTxs).toEqual([]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should not continue to create inner proof', async () => {
      rollupCreator.create.mockImplementationOnce(() => {
        coordinator.interrupt();
        return Buffer.alloc(0);
      });
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => mockTx(i));
      const published = await coordinator.processPendingTxs(pendingTxs);
      expect(published).toBe(false);
      expect(coordinator.processedTxs).toEqual(pendingTxs.slice(0, numInnerRollupTxs));
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should not aggregate if interrupted after creating all inner proofs', async () => {
      rollupCreator.create.mockImplementationOnce(() => Buffer.alloc(0));
      rollupCreator.create.mockImplementationOnce(() => Buffer.alloc(0));
      rollupCreator.create.mockImplementationOnce(() => Buffer.alloc(0));
      rollupCreator.create.mockImplementationOnce(() => {
        coordinator.interrupt();
        return Buffer.alloc(0);
      });
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => mockTx(i));
      const published = await coordinator.processPendingTxs(pendingTxs);
      expect(published).toBe(false);
      expect(coordinator.processedTxs).toEqual(pendingTxs);
      expect(rollupCreator.create).toHaveBeenCalledTimes(numOuterRollupProofs);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should not publish if interrupted during aggregation', async () => {
      rollupAggregator.aggregateRollupProofs.mockImplementationOnce(() => {
        coordinator.interrupt();
        return Buffer.alloc(0);
      });
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => mockTx(i));
      const published = await coordinator.processPendingTxs(pendingTxs);
      expect(published).toBe(false);
      expect(coordinator.processedTxs).toEqual(pendingTxs);
      expect(rollupCreator.create).toHaveBeenCalledTimes(numOuterRollupProofs);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });
  });
});

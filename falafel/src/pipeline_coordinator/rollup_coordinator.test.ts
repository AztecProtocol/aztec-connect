import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeId, BridgeConfig, BitConfig } from '@aztec/barretenberg/bridge_id';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { toBigIntBE, toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { randomBytes } from 'crypto';
import { TxDao } from '../entity/tx';
import { RollupAggregator } from '../rollup_aggregator';
import { RollupCreator } from '../rollup_creator';
import { RollupPublisher } from '../rollup_publisher';
import { PublishTimeManager, RollupTimeout, RollupTimeouts } from './publish_time_manager';
import { RollupCoordinator } from './rollup_coordinator';
import { TxFeeResolver } from '../tx_fee_resolver';
import { BridgeResolver } from '../bridge';
import { ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';

jest.useFakeTimers();

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

const bridgeConfigs: BridgeConfig[] = [
  {
    bridgeId: 1n,
    numTxs: 5,
    fee: 1000000n,
    rollupFrequency: 2,
  },
  {
    bridgeId: 2n,
    numTxs: 10,
    fee: 5000000n,
    rollupFrequency: 3,
  },
  {
    bridgeId: 3n,
    numTxs: 3,
    fee: 90000n,
    rollupFrequency: 4,
  },
  {
    bridgeId: 4n,
    numTxs: 6,
    fee: 3000000n,
    rollupFrequency: 1,
  },
  {
    bridgeId: 5n,
    numTxs: 2,
    fee: 8000000n,
    rollupFrequency: 7,
  },
  {
    bridgeId: 6n,
    numTxs: 20,
    fee: 3000000n,
    rollupFrequency: 8,
  },
];

const numberOfBridgeCalls = RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK;

// When we updated the numberOfBridgeCalls from 4 to 32, we needed _way_ more bridge configs.
// Since only the first 6 (instantiated above) need bespoke values for various tests, we'll pad with the same values here.
const padBridgeConfigs = () => {
  // some tests need >numberOfBridgeCalls bridge calls so we'll add numberOfBridgeCalls configs on top of the existing 6.
  for (let i = 1; i <= numberOfBridgeCalls + 1; i++) {
    bridgeConfigs.push({
      bridgeId: BigInt(i + 6),
      numTxs: 1, // arbitrary
      fee: 90000n, // arbitrary
      rollupFrequency: 4, // arbitrary
    });
  }
};
padBridgeConfigs();

const BASE_GAS = 20000n;
const NON_DEFI_TX_GAS = 100000n;
const DEFI_TX_GAS = 50000n;
const DEFI_TX_PLUS_BASE_GAS = BASE_GAS + DEFI_TX_GAS;
const HUGE_FEE = 10000000n;

const NON_FEE_PAYING_ASSET = 999;

const getBridgeCost = (bridgeId: bigint) => {
  const bridgeConfig = bridgeConfigs.find(bc => bc.bridgeId === bridgeId);
  if (!bridgeConfig) {
    throw new Error(`Requested cost for invalid bridge ID: ${bridgeId.toString()}`);
  }
  return bridgeConfig.fee!;
};

const getSingleBridgeCost = (bridgeId: bigint) => {
  const bridgeConfig = bridgeConfigs.find(bc => bc.bridgeId === bridgeId);
  if (!bridgeConfig) {
    throw new Error(`Requested cost for invalid bridge ID: ${bridgeId.toString()}`);
  }
  const fee = bridgeConfig.fee!;
  const numTxs = BigInt(bridgeConfig.numTxs);
  const single = fee / numTxs;
  return fee % numTxs > 0n ? single + 1n : single;
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
  let feeResolver: Mockify<TxFeeResolver>;
  let bridgeResolver: Mockify<BridgeResolver>;
  let coordinator: RollupCoordinator;

  let currentTime = new Date('2021-06-20T11:45:00+01:00');

  const getCurrentTime = () => currentTime;

  let rollupTimeouts: RollupTimeouts = {
    baseTimeout: { timeout: new Date('2021-06-20T10:00:00+00:00'), rollupNumber: 1 },
    bridgeTimeouts: new Map<bigint, RollupTimeout>([
      [bridgeConfigs[0].bridgeId, { timeout: new Date('2021-06-20T10:00:00+00:00'), rollupNumber: 1 }],
      [bridgeConfigs[1].bridgeId, { timeout: new Date('2021-06-20T09:00:00+00:00'), rollupNumber: 1 }],
      [bridgeConfigs[2].bridgeId, { timeout: new Date('2021-06-20T09:30:00+00:00'), rollupNumber: 1 }],
      [bridgeConfigs[3].bridgeId, { timeout: new Date('2021-06-20T08:00:00+00:00'), rollupNumber: 1 }],
    ]),
  };

  const txTypeToProofId = (txType: TxType) => (txType < TxType.WITHDRAW_TO_CONTRACT ? txType + 1 : txType);

  const mockTx = (
    id: number,
    {
      txType = TxType.TRANSFER,
      txFeeAssetId = 0,
      excessGas = 0n,
      creationTime = new Date(new Date('2021-06-20T11:43:00+01:00').getTime() + id), // ensures txs are ordered by id
      bridgeId = new BridgeId(
        randomInt(),
        1,
        0,
        1,
        0,
        new BitConfig(false, false, false, false, false, false),
        0,
      ).toBigInt(),
      noteCommitment1 = randomBytes(32),
      noteCommitment2 = randomBytes(32),
      backwardLink = Buffer.alloc(32),
      allowChain = numToUInt32BE(2, 32),
    } = {},
  ) =>
    ({
      id: Buffer.from([id]),
      txType,
      created: creationTime,
      excessGas: excessGas,
      proofData: Buffer.concat([
        numToUInt32BE(txTypeToProofId(txType), 32),
        noteCommitment1,
        noteCommitment2,
        randomBytes(6 * 32),
        toBufferBE(0n, 32),
        numToUInt32BE(txFeeAssetId, 32),
        toBufferBE(bridgeId, 32),
        randomBytes(3 * 32),
        backwardLink,
        allowChain,
      ]),
    } as any as TxDao);

  const mockDefiBridgeTx = (id: number, fee: bigint, bridgeId: bigint, assetId = 0) =>
    mockTx(id, {
      txType: TxType.DEFI_DEPOSIT,
      excessGas: fee - (DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
      txFeeAssetId: assetId,
      bridgeId,
    });

  const expectProcessedTxIds = (txIds: number[]) => {
    expect(coordinator.processedTxs.map(tx => tx.id)).toEqual(txIds.map(id => Buffer.from([id])));
  };

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => getCurrentTime().getTime());

    jest.spyOn(console, 'log').mockImplementation(() => {});

    publishTimeManager = {
      calculateLastTimeouts: jest.fn().mockImplementation(() => rollupTimeouts),
      calculateNextTimeouts: jest.fn(),
    };

    rollupCreator = {
      create: jest
        .fn()
        .mockImplementation(async (txs: TxDao[], rootRollupBridgeIds: bigint[], rootRollupAssetIds: Set<number>) => {
          for (const tx of txs) {
            const proof = new ProofData(tx.proofData);
            if (proof.proofId === ProofId.ACCOUNT) {
              continue;
            }
            const asset = proof.txFeeAssetId.readUInt32BE(28);
            if (feeResolver.isFeePayingAsset(asset)) {
              rootRollupAssetIds.add(asset);
            }
            if (proof.proofId !== ProofId.DEFI_DEPOSIT) {
              continue;
            }
            const proofBridgeId = toBigIntBE(proof.bridgeId);
            if (rootRollupBridgeIds.findIndex(bridge => bridge === proofBridgeId) === -1) {
              rootRollupBridgeIds.push(proofBridgeId);
            }
          }
        }),
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

    feeResolver = {
      getMinTxFee: jest.fn().mockImplementation(() => {
        throw new Error('This should not be called');
      }),
      setConf: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      getGasPaidForByFee: jest.fn().mockImplementation((assetId: number, fee: bigint) => fee),
      getBaseTxGas: jest.fn().mockReturnValue(BASE_GAS),
      getTxGas: jest.fn().mockImplementation(() => {
        throw new Error('This should not be called');
      }),
      getBridgeTxGas: jest.fn(),
      getFullBridgeGas: jest.fn().mockImplementation((bridgeId: bigint) => getBridgeCost(bridgeId)),
      getSingleBridgeTxGas: jest.fn().mockImplementation((bridgeId: bigint) => getSingleBridgeCost(bridgeId)),
      getTxFees: jest.fn(),
      getDefiFees: jest.fn(),
      isFeePayingAsset: jest.fn().mockImplementation((assetId: number) => assetId < 3),
    };

    bridgeResolver = {
      getBridgeConfigs: jest.fn().mockReturnValue(bridgeConfigs),
    } as any;

    coordinator = new RollupCoordinator(
      publishTimeManager as any,
      rollupCreator as any,
      rollupAggregator as any,
      rollupPublisher as any,
      numInnerRollupTxs,
      numOuterRollupProofs,
      oldDefiRoot,
      oldDefiPath,
      bridgeResolver as any,
      feeResolver as any,
      defiInteractionNotes,
    );
  });

  describe('publish time is in the future', () => {
    it('should do nothing if txs is empty', async () => {
      const rp = await coordinator.processPendingTxs([]);
      expect(rp.published).toBe(false);
      expect(coordinator.processedTxs).toEqual([]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should do nothing if txs are not enough to create an inner proof', async () => {
      const pendingTxs = [...Array(numInnerRollupTxs - 1)].map((_, i) => mockTx(i));
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expect(coordinator.processedTxs).toEqual([]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should create inner proofs but not publish if outer rollup is not full', async () => {
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs - 1)].map((_, i) => mockTx(i));
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expect(coordinator.processedTxs).toEqual(pendingTxs.slice(0, numInnerRollupTxs * (numOuterRollupProofs - 1)));
      expect(rollupCreator.create).toHaveBeenCalledTimes(numOuterRollupProofs - 1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should aggregate and publish if txs is full', async () => {
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => mockTx(i));
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(coordinator.processedTxs).toEqual(pendingTxs);
      expect(rollupCreator.create).toHaveBeenCalledTimes(numOuterRollupProofs);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should do nothing with new txs if it has successfully published a rollup', async () => {
      const numTxs = numInnerRollupTxs * numOuterRollupProofs;
      {
        const pendingTxs = [...Array(numTxs)].map((_, i) => mockTx(i));
        const rp = await coordinator.processPendingTxs(pendingTxs);
        expect(rp.published).toBe(true);
        expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      }
      {
        const pendingTxs = [...Array(numTxs)].map((_, i) => mockTx(i + numTxs));
        const rp = await coordinator.processPendingTxs(pendingTxs);
        expect(rp.published).toBe(false);
        expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('number of bridge calls per block never exceeded', () => {
    // A separate describe block for these, as we need to increase the rollup topology to a 2x32 to push the numberOfBridgeCalls = 32 limit.

    const numInnerRollupTxs = numberOfBridgeCalls;
    const numOuterRollupProofs = 2;

    beforeEach(() => {
      Object.assign(coordinator, { numInnerRollupTxs, numOuterRollupProofs });
    });

    it('will not rollup defi deposit proofs with more than the allowed distinct bridge ids', async () => {
      // All defi txs have enough fee to be published independently
      const pendingTxs = [];
      let j = 1; // for incrementing the bridgeId
      // Create 72 mock txs to comfortably exceed the 2x32 rollup size (as some of the defi txs will be rejected by the coordinator for
      // exceeding the maxNumberOfBridgeCalls, but we still need to fill the rollup).
      for (let i = 0; i < 72; i++) {
        // Occasionally insert a regular tx, for realism. `7` chosen arbitrarily.
        if (i % 7 === 0) {
          pendingTxs.push(mockTx(i, { txType: TxType.TRANSFER, txFeeAssetId: 0 }));
          // Notice we don't increment j here, because we want the bridgeId for j to be included in the next iteration.
          continue;
        }
        // We'll allow the number of bridgeIds to exceed the max number of bridge calls per block by 2.
        // So 2 of our txs _should_ be rejected from the first (and only) rollup of this test.
        const bridgeId = BigInt(((j - 1) % (numberOfBridgeCalls + 2)) + 1); // 1, 2, ..., 31, 32, 33, 34.
        pendingTxs.push(mockDefiBridgeTx(i, HUGE_FEE, bridgeId));
        j++;
      }

      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);

      // Expect all txs but those with bridgeId = 33 or 34.
      const expectedTxs = pendingTxs
        .filter(tx => {
          const proof = new ProofData(tx.proofData);
          // We can safely coerce to a number, because we know these are small numbers in this test:
          const bid = Number(BridgeId.fromBuffer(proof.bridgeId).toBigInt());
          // ... except for the non-defi txs, which have huge bridgeIds (much greater than 1000, say):
          return bid <= numberOfBridgeCalls || bid > 1000;
        })
        .slice(0, numInnerRollupTxs * numOuterRollupProofs); // the rollup will only include the first 64 filtered txs

      expect(coordinator.processedTxs).toEqual(expectedTxs);
      expect(rollupCreator.create).toHaveBeenCalledTimes(2); // this is the # inner rollups that get created
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual(
        Array(numberOfBridgeCalls)
          .fill(0)
          .map((_, i) => bridgeConfigs[i].bridgeId),
      );
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('distinct bridge ids are maintained across invocations', async () => {
      // All defi txs have enough fee to be published independently
      const allTxs = [];
      let j = 1; // for incrementing the bridgeId
      // Create 65 mock txs to slightly exceed the 2x32 rollup size (as one of the defi txs will be rejected by the coordinator for
      // exceeding the maxNumberOfBridgeCalls, but we still need to fill the rollup).
      for (let i = 0; i < numInnerRollupTxs * numOuterRollupProofs + 1; i++) {
        // Alternately insert regular txs, for some realism.
        if (i % 2 === 1) {
          allTxs.push(mockTx(i, { txType: TxType.TRANSFER, txFeeAssetId: 0 }));
          // Notice we don't increment j here, because we want the bridgeId for j to be included in the next iteration.
          continue;
        }
        // We'll allow the number of bridgeIds to exceed the max number of bridge calls per block by 1.
        // So _one_ of our txs _should_ be rejected from the first (and only) rollup of this test.
        const index = (j - 1) % (numberOfBridgeCalls + 1); // 0, 1, 2, ..., 31, 32.
        allTxs.push(
          mockDefiBridgeTx(i, DEFI_TX_PLUS_BASE_GAS + bridgeConfigs[index].fee!, bridgeConfigs[index].bridgeId),
        );
        j++;
      }

      // So the tx ordering is: defi, normal, defi, normal,..., defi, normal, DEFI WITH BAD BRIDGE ID.
      // We want the test to _attempt_ to insert the defi tx with a 'bad' bridgeId (which will be rejected).
      // Then we want the test to instead insert the normal tx as part of the batch.

      // Attempt to include the first 33 txs (one more than an inner rollup size).
      // The 33rd tx won't be included in the first inner rollup.
      let pendingTxs = allTxs.slice(0, numInnerRollupTxs + 1);
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expect(coordinator.processedTxs).toEqual(allTxs.slice(0, numInnerRollupTxs));
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // Include the tx that didn't get added, plus the next 31 (i.e. attempt to fill the next rollup with the next 32 txs).
      // However, no more of these txs are added. We need at least 32 for an inner rollup and the final tx in this batch contains a 33rd bridgeId when only 32 are allowed.
      const numTxsInRollup = numInnerRollupTxs * numOuterRollupProofs;
      pendingTxs = [...allTxs.slice(numInnerRollupTxs, numTxsInRollup - 1), allTxs[numTxsInRollup]]; // skip over the penultimate element and try to insert the tx with a 'bad' bridgeId.
      rp = await coordinator.processPendingTxs(pendingTxs);

      expect(rp.published).toBe(false);
      expect(coordinator.processedTxs).toEqual(allTxs.slice(0, numInnerRollupTxs));
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // Insert a batch of valid txs into the inner rollup, to show they'll be accepted.
      pendingTxs = allTxs.slice(numInnerRollupTxs);
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(coordinator.processedTxs).toEqual(allTxs.slice(0, numTxsInRollup));
      expect(rollupCreator.create).toHaveBeenCalledTimes(2);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual(
        Array(numberOfBridgeCalls)
          .fill(0)
          .map((_, i) => bridgeConfigs[i].bridgeId),
      );
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('will not flush defi deposit txs if we have more than the allowed distinct bridge ids', async () => {
      const pendingTxs = [];
      let j = 1; // for incrementing the bridgeId
      // Create 72 mock txs to comfortably exceed the 2x32 rollup size (as some of the defi txs will be rejected by the coordinator for
      // exceeding the maxNumberOfBridgeCalls, but we still need to fill the rollup).
      for (let i = 1; i <= 72; i++) {
        // Occasionally insert a regular tx, for realism. `7` chosen arbitrarily.
        if (i % 7 === 0) {
          pendingTxs.push(mockTx(i, { txType: TxType.TRANSFER, txFeeAssetId: 0 }));
          // Notice we don't increment j here, because we want the bridgeId for j to be included in the next iteration.
          continue;
        }
        // We'll allow the number of bridgeIds to exceed the max number of bridge calls per block by 2.
        // So 2 of our txs _should_ be rejected from the first (and only) rollup of this test.
        const bridgeId = BigInt(((j - 1) % (numberOfBridgeCalls + 2)) + 1); // 1, 2, ..., 31, 32, 33, 34.
        pendingTxs.push(mockDefiBridgeTx(i, HUGE_FEE, bridgeId));
        j++;
      }

      const rp = await coordinator.processPendingTxs(pendingTxs, true);
      expect(rp.published).toBe(true);
      // Expect all txs but those with bridgeId = 33 or 34.
      const expectedTxs = pendingTxs
        .filter(tx => {
          const proof = new ProofData(tx.proofData);
          // We can safely coerce to a number, because we know these are small numbers in this test:
          const bid = Number(BridgeId.fromBuffer(proof.bridgeId).toBigInt());
          // ... except for the non-defi txs, which have huge bridgeIds (much greater than 1000, say):
          return bid <= numberOfBridgeCalls || bid > 1000;
        })
        .slice(0, numInnerRollupTxs * numOuterRollupProofs); // the rollup will only include the first 64 filtered txs

      expect(coordinator.processedTxs).toEqual(expectedTxs);
      expect(rollupCreator.create).toHaveBeenCalledTimes(2);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual(
        Array(numberOfBridgeCalls)
          .fill(0)
          .map((_, i) => bridgeConfigs[i].bridgeId),
      );
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });
  });

  describe('picking txs to rollup', () => {
    it('will rollup defi claim proofs first', async () => {
      const pendingTxs = [
        mockTx(0, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.ACCOUNT, txFeeAssetId: 0 }),
        mockDefiBridgeTx(2, HUGE_FEE, bridgeConfigs[0].bridgeId, 0),
        mockTx(3, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
        mockTx(4, { txType: TxType.WITHDRAW_TO_CONTRACT, txFeeAssetId: 0 }),
        mockTx(5, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
        mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(7, { txType: TxType.WITHDRAW_TO_WALLET, txFeeAssetId: 0 }),
        mockTx(8, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
        mockDefiBridgeTx(9, HUGE_FEE, bridgeConfigs[0].bridgeId, 0),
        mockTx(10, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
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
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeConfigs[0].bridgeId,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it("will not rollup defi deposit proofs if the bridge isn't profitable", async () => {
      const bridgeId = bridgeConfigs[0].bridgeId;
      const mockDefiBridgeTxLocal = (id: number, fee: bigint) => mockDefiBridgeTx(id, fee, bridgeId);

      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(2, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockTx(4, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(5, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([0, 1, 4, 5]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(2);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('will rollup defi txs once the bridge is profitable', async () => {
      const bridgeId = bridgeConfigs[2].bridgeId;
      const mockDefiBridgeTxLocal = (id: number, fee: bigint) => mockDefiBridgeTx(id, fee, bridgeId);

      let pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(2, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockTx(4, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(5, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([0, 1, 4, 5]);

      // then we get some more txs. Of course we still have the defis from before
      pendingTxs = [
        mockDefiBridgeTxLocal(2, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(7, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockTx(8, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(9, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(10, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1, 4, 5, 6, 2, 3, 7]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(4);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeId,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('will continue to add defi txs to profitable bridge', async () => {
      const bridgeId = bridgeConfigs[2].bridgeId;
      const mockDefiBridgeTxLocal = (id: number, fee: bigint) => mockDefiBridgeTx(id, fee, bridgeId);

      const pendingTxs = [
        mockDefiBridgeTxLocal(0, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockDefiBridgeTxLocal(4, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockTx(5, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([2, 0, 1, 3, 4, 5]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(3);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // 6 txs have been rollup so pending txs now just has the last one
      pendingTxs.splice(0, 6);
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([2, 0, 1, 3, 4, 5, 6]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(4);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeId,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('will create bridge batch as soon as it is profitable', async () => {
      const bridgeId = bridgeConfigs[2].bridgeId;
      const mockDefiBridgeTxLocal = (id: number, fee: bigint) => mockDefiBridgeTx(id, fee, bridgeId);

      const pendingTxs = [
        mockDefiBridgeTxLocal(0, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeId)),
        mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(5, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([0, 2, 5, 6]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(2);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('will fill bridge batch even after batch is profitable', async () => {
      const bridgeId = bridgeConfigs[2].bridgeId;
      const mockDefiBridgeTxLocal = (id: number, fee: bigint) => mockDefiBridgeTx(id, fee, bridgeId);

      const pendingTxs = [
        mockDefiBridgeTxLocal(0, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeId)),
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockTx(5, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(7, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockDefiBridgeTxLocal(8, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1, 2, 3, 5, 6, 7, 8]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(4);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeId,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('will only keep filling profitable bridge batch', async () => {
      const bridgeId = bridgeConfigs[2].bridgeId;
      const mockDefiBridgeTxLocal = (id: number, fee: bigint) => mockDefiBridgeTx(id, fee, bridgeId);

      const pendingTxs = [
        mockDefiBridgeTxLocal(0, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeId)),
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[0].bridgeId),
          bridgeConfigs[0].bridgeId,
        ),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockTx(4, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          5,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[0].bridgeId),
          bridgeConfigs[0].bridgeId,
        ),
        mockDefiBridgeTxLocal(6, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockDefiBridgeTxLocal(7, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockTx(8, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          9,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[0].bridgeId),
          bridgeConfigs[0].bridgeId,
        ),
        mockTx(10, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1, 3, 4, 6, 7, 8, 10]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(4);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeId,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('will only keep filling profitable bridge batch across invocations', async () => {
      const bridgeId = bridgeConfigs[2].bridgeId;
      const mockDefiBridgeTxLocal = (id: number, fee: bigint) => mockDefiBridgeTx(id, fee, bridgeId);

      let pendingTxs = [
        mockDefiBridgeTxLocal(0, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeId)),
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
      ];
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([0, 1]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      pendingTxs = [
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[0].bridgeId),
          bridgeConfigs[0].bridgeId,
        ),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockTx(4, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([0, 1, 3, 4]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(2);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      pendingTxs = [
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[0].bridgeId),
          bridgeConfigs[0].bridgeId,
        ),
        mockDefiBridgeTx(
          5,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[0].bridgeId),
          bridgeConfigs[0].bridgeId,
        ),
        mockDefiBridgeTxLocal(6, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockDefiBridgeTxLocal(7, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockTx(8, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          9,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[0].bridgeId),
          bridgeConfigs[0].bridgeId,
        ),
        mockTx(10, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1, 3, 4, 6, 7, 8, 10]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(4);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeConfigs[2].bridgeId,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('will only fill bridge batch up to rollup size', async () => {
      const bridgeId = bridgeConfigs[2].bridgeId;
      const mockDefiBridgeTxLocal = (id: number, fee: bigint) => mockDefiBridgeTx(id, fee, bridgeId);

      const pendingTxs = [
        mockDefiBridgeTxLocal(0, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeId)),
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[0].bridgeId),
          bridgeConfigs[0].bridgeId,
        ),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockTx(4, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          5,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[0].bridgeId),
          bridgeConfigs[0].bridgeId,
        ),
        mockDefiBridgeTxLocal(6, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockDefiBridgeTxLocal(7, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockTx(8, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          9,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[0].bridgeId),
          bridgeConfigs[0].bridgeId,
        ),
        mockDefiBridgeTxLocal(10, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockDefiBridgeTxLocal(11, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockDefiBridgeTxLocal(12, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1, 3, 4, 6, 7, 8, 10]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(4);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeConfigs[2].bridgeId,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('will not split bridge batch over rollups', async () => {
      const bridgeId = bridgeConfigs[2].bridgeId;
      const mockDefiBridgeTxLocal = (id: number, fee: bigint) => mockDefiBridgeTx(id, fee, bridgeId);

      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockDefiBridgeTxLocal(4, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockTx(5, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(7, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(8, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)), // for this to go in, the batch would have to be split
        mockTx(9, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(10, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1, 2, 5, 6, 7, 9, 10]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(4);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([...Array(numberOfBridgeCalls).fill(0n)]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('will put multiple bridges in one rollup', async () => {
      const pendingTxs = [
        mockDefiBridgeTx(
          0,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[4].bridgeId),
          bridgeConfigs[4].bridgeId,
        ),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[2].bridgeId),
          bridgeConfigs[2].bridgeId,
        ),
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[2].bridgeId),
          bridgeConfigs[2].bridgeId,
        ),
        mockDefiBridgeTx(
          3,
          DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeConfigs[0].bridgeId),
          bridgeConfigs[0].bridgeId,
        ),
        mockDefiBridgeTx(
          4,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[4].bridgeId),
          bridgeConfigs[4].bridgeId,
        ),
        mockDefiBridgeTx(
          5,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[2].bridgeId),
          bridgeConfigs[2].bridgeId,
        ),
        mockDefiBridgeTx(
          6,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[4].bridgeId),
          bridgeConfigs[4].bridgeId,
        ),
        mockDefiBridgeTx(
          7,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[4].bridgeId),
          bridgeConfigs[4].bridgeId,
        ),
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([3, 0, 4, 1, 2, 5, 6, 7]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(4);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeConfigs[0].bridgeId,
        bridgeConfigs[4].bridgeId,
        bridgeConfigs[2].bridgeId,
        ...Array(numberOfBridgeCalls - 3).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('all assets and bridges are added to aggregator', async () => {
      const pendingTxs = [
        mockDefiBridgeTx(
          0,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[4].bridgeId),
          bridgeConfigs[4].bridgeId,
          1,
        ),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[2].bridgeId),
          bridgeConfigs[2].bridgeId,
        ),
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[2].bridgeId),
          bridgeConfigs[2].bridgeId,
        ),
        mockDefiBridgeTx(
          3,
          DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeConfigs[0].bridgeId),
          bridgeConfigs[0].bridgeId,
        ),
        mockDefiBridgeTx(
          4,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[4].bridgeId),
          bridgeConfigs[4].bridgeId,
          1,
        ),
        mockDefiBridgeTx(
          5,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[2].bridgeId),
          bridgeConfigs[2].bridgeId,
        ),
        mockDefiBridgeTx(
          6,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[4].bridgeId),
          bridgeConfigs[4].bridgeId,
          1,
        ),
        mockDefiBridgeTx(
          7,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[4].bridgeId),
          bridgeConfigs[4].bridgeId,
          1,
        ),
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([3, 0, 4, 1, 2, 5, 6, 7]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(4);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0, 1]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeConfigs[0].bridgeId,
        bridgeConfigs[4].bridgeId,
        bridgeConfigs[2].bridgeId,
        ...Array(numberOfBridgeCalls - 3).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('non-fee paying assets are not added to aggregator 1', async () => {
      const pendingTxs = [
        mockDefiBridgeTx(
          0,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[4].bridgeId),
          bridgeConfigs[4].bridgeId,
          1,
        ),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[2].bridgeId),
          bridgeConfigs[2].bridgeId,
        ),
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[2].bridgeId),
          bridgeConfigs[2].bridgeId,
          NON_FEE_PAYING_ASSET,
        ),
        mockDefiBridgeTx(
          3,
          DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeConfigs[0].bridgeId),
          bridgeConfigs[0].bridgeId,
        ),
        mockDefiBridgeTx(
          4,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[4].bridgeId),
          bridgeConfigs[4].bridgeId,
          1,
        ),
        mockDefiBridgeTx(
          5,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[2].bridgeId),
          bridgeConfigs[2].bridgeId,
          NON_FEE_PAYING_ASSET + 1,
        ),
        mockDefiBridgeTx(
          6,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[4].bridgeId),
          bridgeConfigs[4].bridgeId,
          1,
        ),
        mockDefiBridgeTx(
          7,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[4].bridgeId),
          bridgeConfigs[4].bridgeId,
          1,
        ),
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([3, 0, 4, 1, 2, 5, 6, 7]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(4);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0, 1]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeConfigs[0].bridgeId,
        bridgeConfigs[4].bridgeId,
        bridgeConfigs[2].bridgeId,
        ...Array(numberOfBridgeCalls - 3).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('non-fee paying assets are not added to aggregator 2', async () => {
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) =>
        mockTx(i, { txFeeAssetId: i == 0 ? 0 : i + NON_FEE_PAYING_ASSET }),
      );
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(coordinator.processedTxs).toEqual(pendingTxs);
      expect(rollupCreator.create).toHaveBeenCalledTimes(numOuterRollupProofs);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([...Array(numberOfBridgeCalls).fill(0n)]);
    });

    it('single defi tx can publish if it covers rollup + bridge costs', async () => {
      let fullCost = BigInt(numInnerRollupTxs * numOuterRollupProofs - 1) * BASE_GAS; // all other slots
      fullCost += DEFI_TX_PLUS_BASE_GAS + bridgeConfigs[1].fee!; // our slot
      const pendingTxs = [mockDefiBridgeTx(0, fullCost, bridgeConfigs[1].bridgeId)];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeConfigs[1].bridgeId,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('single defi tx can publish if it covers rollup + bridge costs 2', async () => {
      let almostFullCost = BigInt(numInnerRollupTxs * numOuterRollupProofs - 3) * BASE_GAS; // pays for all but 3 slots
      almostFullCost += DEFI_TX_PLUS_BASE_GAS + bridgeConfigs[1].fee!; // pays for defi deposit slot + whole bridge
      let pendingTxs = [
        mockDefiBridgeTx(0, almostFullCost, bridgeConfigs[1].bridgeId),
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([0, 1]);

      // 1 inner rollup has been created
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      pendingTxs = [mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: 0 })];
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1, 2]);

      // rollup is now profitable
      expect(rollupCreator.create).toHaveBeenCalledTimes(2);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeConfigs[1].bridgeId,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('single defi tx can publish if it covers rollup + bridge costs 3', async () => {
      let almostFullCost = BigInt(numInnerRollupTxs * numOuterRollupProofs - 2) * BASE_GAS; // pays for all but 2 slots
      almostFullCost += DEFI_TX_PLUS_BASE_GAS + bridgeConfigs[1].fee!; // pays for defi deposit slot + whole bridge
      let pendingTxs = [
        mockDefiBridgeTx(0, almostFullCost, bridgeConfigs[1].bridgeId),
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([0, 1]);

      // 1 inner rollup has been created
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // calling agian with the empty array of pending txs will cause the publish
      pendingTxs = [];
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeConfigs[1].bridgeId,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('single defi tx can publish if it covers rollup + bridge costs 3', async () => {
      let almostFullCost = BigInt(numInnerRollupTxs * numOuterRollupProofs - 1) * BASE_GAS; // needs 1 more tx to make profitable
      almostFullCost += DEFI_TX_PLUS_BASE_GAS + bridgeConfigs[1].fee!; // bridge cost
      let pendingTxs = [
        mockDefiBridgeTx(0, almostFullCost, bridgeConfigs[1].bridgeId),
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([0, 1]);

      // 1 inner rollup has been created
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // calling agian with the empty array of pending txs will cause the publish
      pendingTxs = [];
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeConfigs[1].bridgeId,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('single payment tx can publish if it covers complete cost', async () => {
      const fullCost = BigInt(numInnerRollupTxs * numOuterRollupProofs - 1) * BASE_GAS; // excess gas is all other slots
      const pendingTxs = [mockTx(0, { txType: TxType.TRANSFER, excessGas: fullCost, txFeeAssetId: 0 })];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual(Array(numberOfBridgeCalls).fill(0n));
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('single payment tx can publish if it covers complete cost 2', async () => {
      const fullCost = BigInt(numInnerRollupTxs * numOuterRollupProofs - 1) * BASE_GAS; // excess gas is all other slots
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, excessGas: fullCost, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([0, 1]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // pending txs is now empty, call again with the empty array and the rollup will be published
      rp = await coordinator.processPendingTxs([]);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual(Array(numberOfBridgeCalls).fill(0n));
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('single payment tx can publish if it covers complete cost 2', async () => {
      let fullCost = BigInt(numInnerRollupTxs * numOuterRollupProofs) * BASE_GAS; // full base cost of rollup
      fullCost += NON_DEFI_TX_GAS; // payment tx cost
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, excessGas: fullCost, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([0, 1]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // pending txs is now empty, call again with the empty array and the rollup will be published
      rp = await coordinator.processPendingTxs([]);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual(Array(numberOfBridgeCalls).fill(0n));
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('defi txs are not published if bridge is not profitable, even if rollup is', async () => {
      const fullCost = BigInt(numInnerRollupTxs * numOuterRollupProofs - 1) * BASE_GAS; // excess gas is all other slots
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, excessGas: fullCost, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[0].bridgeId),
          bridgeConfigs[0].bridgeId,
        ),
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual(Array(numberOfBridgeCalls).fill(0n));
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('not all complete bridges can be put into a rollup', async () => {
      let pendingTxs = [
        mockDefiBridgeTx(
          0,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[2].bridgeId),
          bridgeConfigs[2].bridgeId,
        ),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[2].bridgeId),
          bridgeConfigs[2].bridgeId,
        ),
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[3].bridgeId),
          bridgeConfigs[3].bridgeId,
        ),
        mockDefiBridgeTx(
          3,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[3].bridgeId),
          bridgeConfigs[3].bridgeId,
        ),
        mockDefiBridgeTx(
          4,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[3].bridgeId),
          bridgeConfigs[3].bridgeId,
        ),
        mockDefiBridgeTx(
          5,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[3].bridgeId),
          bridgeConfigs[3].bridgeId,
        ),
        mockDefiBridgeTx(
          6,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[3].bridgeId),
          bridgeConfigs[3].bridgeId,
        ),
        mockDefiBridgeTx(
          7,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[2].bridgeId),
          bridgeConfigs[2].bridgeId,
        ),
        mockDefiBridgeTx(
          8,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[3].bridgeId),
          bridgeConfigs[3].bridgeId,
        ),
      ];
      // bridge [2] got in meaning bridge [3] couldn't as there isn't enough room
      // we can only rollup the first 2 txs for bridge [2] here
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([0, 1]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // removed the 2 already rolled up, and a payment has come in
      pendingTxs = [
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[3].bridgeId),
          bridgeConfigs[3].bridgeId,
        ),
        mockDefiBridgeTx(
          3,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[3].bridgeId),
          bridgeConfigs[3].bridgeId,
        ),
        mockDefiBridgeTx(
          4,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[3].bridgeId),
          bridgeConfigs[3].bridgeId,
        ),
        mockDefiBridgeTx(
          5,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[3].bridgeId),
          bridgeConfigs[3].bridgeId,
        ),
        mockDefiBridgeTx(
          6,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[3].bridgeId),
          bridgeConfigs[3].bridgeId,
        ),
        mockDefiBridgeTx(
          7,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[2].bridgeId),
          bridgeConfigs[2].bridgeId,
        ),
        mockDefiBridgeTx(
          8,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[3].bridgeId),
          bridgeConfigs[3].bridgeId,
        ),
        mockTx(9, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];
      // we can now rollup the final bridge [2] tx
      // still can't do anything with bridge [3]
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([0, 1, 7, 9]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(2);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });
  });

  describe('rollup timeouts', () => {
    const numInnerRollupTxs = 8;
    const numOuterRollupProofs = 2;
    let oldTime = new Date();
    let oldTimeouts: RollupTimeouts = {
      baseTimeout: { timeout: new Date(0), rollupNumber: 1 },
      bridgeTimeouts: new Map<bigint, RollupTimeout>(),
    };

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
        bridgeResolver as any,
        feeResolver as any,
        defiInteractionNotes,
      );

      oldTime = currentTime;
      currentTime = new Date('2021-06-20T11:45:00+01:00');

      oldTimeouts = rollupTimeouts;
      rollupTimeouts = {
        baseTimeout: { timeout: new Date('2021-06-20T10:00:00+00:00'), rollupNumber: 1 },
        bridgeTimeouts: new Map<bigint, RollupTimeout>([
          [bridgeConfigs[0].bridgeId, { timeout: new Date('2021-06-20T10:00:00+00:00'), rollupNumber: 1 }],
          [bridgeConfigs[1].bridgeId, { timeout: new Date('2021-06-20T09:00:00+00:00'), rollupNumber: 1 }],
          [bridgeConfigs[2].bridgeId, { timeout: new Date('2021-06-20T09:30:00+00:00'), rollupNumber: 1 }],
          [bridgeConfigs[3].bridgeId, { timeout: new Date('2021-06-20T08:00:00+00:00'), rollupNumber: 1 }],
        ]),
      };

      const getTimeouts = () => rollupTimeouts;

      publishTimeManager = {
        calculateLastTimeouts: jest.fn().mockImplementation(() => getTimeouts()),
        calculateNextTimeouts: jest.fn(),
      };
    });

    afterEach(() => {
      currentTime = oldTime;
      rollupTimeouts = oldTimeouts;
    });

    it('should publish a rollup after the rollup timeout', async () => {
      // from above - let currentTime = new Date('2021-06-20T11:45:00+01:00');
      // mockTx default creation time to new Date(new Date('2021-06-20T11:43:00+01:00').getTime() + id)

      const pendingTxs = [mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 })];
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // set the rollup timeout to the following
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 },
      };
      // and set current time just after the timeout
      currentTime = new Date('2021-06-20T12:00:01+01:00');

      // run again and we should have published it
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual(Array(numberOfBridgeCalls).fill(0n));
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should publish a rollup after the rollup timeout 2', async () => {
      // from above - let currentTime = new Date('2021-06-20T11:45:00+01:00');
      // mockTx default creation time to new Date(new Date('2021-06-20T11:43:00+01:00').getTime() + id)

      const pendingTxs = [...Array(numInnerRollupTxs)].map((_, i) =>
        mockTx(i, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      );
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([...Array(numInnerRollupTxs)].map((_, i) => i));

      // txs have been rolled up but not published
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // set the rollup timeout to the following
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 },
      };
      // and set current time just after the timeout
      currentTime = new Date('2021-06-20T12:00:01+01:00');

      // run again, with no pending txs and we will publish
      rp = await coordinator.processPendingTxs([]);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([...Array(numInnerRollupTxs)].map((_, i) => i));

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual(Array(numberOfBridgeCalls).fill(0n));
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should publish a rollup after the rollup timeout 2', async () => {
      // from above - let currentTime = new Date('2021-06-20T11:45:00+01:00');
      // mockTx default creation time to new Date(new Date('2021-06-20T11:43:00+01:00').getTime() + id)

      const pendingTxs = [...Array(numInnerRollupTxs)].map((_, i) =>
        mockTx(i, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      );
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([...Array(numInnerRollupTxs)].map((_, i) => i));

      // txs have been rolled up but not published
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // set the rollup timeout to the following
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 },
      };
      // and set current time just after the timeout
      currentTime = new Date('2021-06-20T12:00:01+01:00');

      // run again, with no pending txs and we will publish
      rp = await coordinator.processPendingTxs([]);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([...Array(numInnerRollupTxs)].map((_, i) => i));

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual(Array(numberOfBridgeCalls).fill(0n));
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should not timeout rollups if no timeout given', async () => {
      // from above - let currentTime = new Date('2021-06-20T11:45:00+01:00');
      // mockTx default creation time to new Date(new Date('2021-06-20T11:43:00+01:00').getTime() + id)

      const pendingTxs = [mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 })];
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // set the rollup timeout to be no timeout
      rollupTimeouts = {
        baseTimeout: undefined,
        bridgeTimeouts: new Map<bigint, RollupTimeout>(),
      };
      // and set current time 100 years from now
      currentTime = new Date('2121-06-20T11:45:00+01:00');

      // run again and we still should not have published it
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should not timeout defi tx on just a rollup timeout', async () => {
      // from above - let currentTime = new Date('2021-06-20T11:45:00+01:00');
      // mockTx default creation time to new Date(new Date('2021-06-20T11:43:00+01:00').getTime() + id)

      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[2].bridgeId),
          bridgeConfigs[2].bridgeId,
        ),
      ];
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // set the rollup timeout to the following
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 },
      };
      // and set current time just after the timeout
      currentTime = new Date('2021-06-20T12:00:01+01:00');

      // run again and we should have published it
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual(Array(numberOfBridgeCalls).fill(0n));
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should timeout defi tx on a bridge timeout', async () => {
      // from above - let currentTime = new Date('2021-06-20T11:45:00+01:00');
      // mockTx default creation time to new Date(new Date('2021-06-20T11:43:00+01:00').getTime() + id)

      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[2].bridgeId),
          bridgeConfigs[2].bridgeId,
        ),
      ];
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // set the rollup timeout and bridge timeouts to the following
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 },
        bridgeTimeouts: new Map<bigint, RollupTimeout>([
          [bridgeConfigs[2].bridgeId, { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 }],
        ]),
      };
      // and set current time just after the timeout
      currentTime = new Date('2021-06-20T12:00:01+01:00');

      // run again and we should have published it
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeConfigs[2].bridgeId,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should only timeout defi tx on a bridge timeout', async () => {
      // from above - let currentTime = new Date('2021-06-20T11:45:00+01:00');
      // mockTx default creation time to new Date(new Date('2021-06-20T11:43:00+01:00').getTime() + id)

      const pendingTxs = [
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[2].bridgeId),
          bridgeConfigs[2].bridgeId,
        ),
      ];
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // set the rollup timeout and bridge timeouts to the following
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 },
        bridgeTimeouts: new Map<bigint, RollupTimeout>([
          [bridgeConfigs[2].bridgeId, { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 }],
        ]),
      };
      // and set current time just after the timeout
      currentTime = new Date('2021-06-20T12:00:01+01:00');

      // run again and we should have published it
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([1]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeConfigs[2].bridgeId,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should timeout multiple bridges', async () => {
      // from above - let currentTime = new Date('2021-06-20T11:45:00+01:00');
      // mockTx default creation time to new Date(new Date('2021-06-20T11:43:00+01:00').getTime() + id)

      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[2].bridgeId),
          bridgeConfigs[2].bridgeId,
        ),
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[0].bridgeId),
          bridgeConfigs[0].bridgeId,
        ),
      ];
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // set the rollup timeout and bridge timeouts to the following
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 },
        bridgeTimeouts: new Map<bigint, RollupTimeout>([
          [bridgeConfigs[0].bridgeId, { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 }],
          [bridgeConfigs[2].bridgeId, { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 }],
        ]),
      };
      // and set current time just after the timeout
      currentTime = new Date('2021-06-20T12:00:01+01:00');

      // run again and we should have published it
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1, 2]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeConfigs[2].bridgeId,
        bridgeConfigs[0].bridgeId,
        ...Array(numberOfBridgeCalls - 2).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should not timeout bridge txs where the bridge has no timeout', async () => {
      // from above - let currentTime = new Date('2021-06-20T11:45:00+01:00');
      // mockTx default creation time to new Date(new Date('2021-06-20T11:43:00+01:00').getTime() + id)

      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[2].bridgeId),
          bridgeConfigs[2].bridgeId,
        ),
      ];
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // set the rollup timeout and bridge timeouts to the following (no timeout for bridge [2])
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 },
        bridgeTimeouts: new Map<bigint, RollupTimeout>(),
      };
      // and set current time just after the timeout
      currentTime = new Date('2021-06-20T12:00:01+01:00');

      // run again and we should have published it
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual(Array(numberOfBridgeCalls).fill(0n));
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    describe('rollup timeouts with larger topology', () => {
      // A separate describe block for these, as we need to increase the rollup topology to a 2x32 to push the numberOfBridgeCalls = 32 limit.

      const numInnerRollupTxs = numberOfBridgeCalls;
      const numOuterRollupProofs = 2;

      beforeEach(() => {
        Object.assign(coordinator, { numInnerRollupTxs, numOuterRollupProofs });
      });

      it('will not timeout defi deposit txs if we have more than the allowed distinct bridge ids', async () => {
        // from above - let currentTime = new Date('2021-06-20T11:45:00+01:00');
        // mockTx default creation time to new Date(new Date('2021-06-20T11:43:00+01:00').getTime() + id)

        const allTxs = [];
        let j = 1; // for incrementing the bridgeId
        for (let i = 0; i < numberOfBridgeCalls * 2; i++) {
          // We'll allow the number of bridgeIds to exceed the max number of bridge calls per block by 2.
          // So 2 of our txs _should_ be rejected from the first (and only) rollup of this test.
          const index = (j - 1) % (numberOfBridgeCalls + 2); // 0, 1, 2, ..., 31, 32, 33.
          allTxs.push(
            mockDefiBridgeTx(i, DEFI_TX_PLUS_BASE_GAS + bridgeConfigs[index].fee!, bridgeConfigs[index].bridgeId),
          );
          j++;
        }

        // Note:
        //   allTxs[32] contains bridgeId 33
        //   allTxs[33] contains bridgeId 34

        let pendingTxs = allTxs;

        // set the rollup timeout and bridge timeouts to the following
        rollupTimeouts = {
          ...rollupTimeouts,
          baseTimeout: { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 },
          bridgeTimeouts: new Map<bigint, RollupTimeout>([
            [bridgeConfigs[4].bridgeId, { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 }],
          ]),
        };
        // and set current time just after the timeout.
        // bridgeIds 33 & 34 are in timeout but we can't fit them in as we have exceeded the max number of bridge ids
        currentTime = new Date('2021-06-20T12:00:01+01:00');

        // this call won't trigger the rollup yet
        let rp = await coordinator.processPendingTxs(pendingTxs);
        expect(rp.published).toBe(false);

        // Expect all txs but those with bridgeId = 33 or 34.
        const expectedTxs = pendingTxs
          .filter(tx => {
            const proof = new ProofData(tx.proofData);
            // We can safely coerce to a number, because we know these are small numbers in this test:
            const bid = Number(BridgeId.fromBuffer(proof.bridgeId).toBigInt());
            // ... except for the non-defi txs, which have huge bridgeIds (much greater than 1000, say):
            return bid <= numberOfBridgeCalls || bid > 1000;
          })
          .slice(0, numberOfBridgeCalls);

        expect(coordinator.processedTxs).toEqual(expectedTxs);

        expect(rollupCreator.create).toHaveBeenCalledTimes(1);
        expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
        expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

        // pending txs now just contains those DEFI txs that can't be rolled up
        pendingTxs = pendingTxs.filter(tx => {
          const proof = new ProofData(tx.proofData);
          const bid = Number(BridgeId.fromBuffer(proof.bridgeId).toBigInt());
          return bid > numberOfBridgeCalls && bid < 1000;
        });

        // calling this again should trigger the rollup - WHY?
        rp = await coordinator.processPendingTxs(pendingTxs);
        expect(rp.published).toBe(true);
        expect(coordinator.processedTxs).toEqual(expectedTxs);
        expect(rollupCreator.create).toHaveBeenCalledTimes(1);
        expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
        expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
        expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual(
          Array(numberOfBridgeCalls)
            .fill(0)
            .map((_, i) => bridgeConfigs[i].bridgeId),
        );
        expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      });
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
        bridgeResolver as any,
        feeResolver as any,
        defiInteractionNotes,
      );
    });

    it('should break a chain if they cannot be in the same inner rollup', async () => {
      // Create 4 defi deposit txs with different bridge ids.
      const defiTxs = bridgeConfigs
        .slice(0, 4)
        .map((bc, i) => mockDefiBridgeTx(i, bc.fee! + DEFI_TX_PLUS_BASE_GAS, bc.bridgeId));

      // Create a chain of 4 txs. The 3rd one is a defi deposit tx.
      const commitments = [...Array(4)].map(() => randomBytes(32));
      const chainedTxs = commitments.slice(0, 2).map((noteCommitment2, i) =>
        mockTx(i + 4, {
          noteCommitment2,
          backwardLink: i ? commitments[i - 1] : Buffer.alloc(32),
        }),
      );
      chainedTxs.push(
        mockTx(6, {
          txType: TxType.DEFI_DEPOSIT,
          bridgeId: bridgeConfigs[4].bridgeId,
          excessGas: 0n,
          noteCommitment2: commitments[2],
          backwardLink: commitments[1],
        }),
      );
      chainedTxs.push(
        mockTx(7, {
          noteCommitment2: commitments[3],
          backwardLink: commitments[2],
        }),
      );

      // Create 3 deposit txs.
      const normalTxs = [...Array(numberOfBridgeCalls - 1)].map((_, i) => mockTx(i + 9));

      const pendingTxs = [
        defiTxs[0], // 0
        defiTxs[1], // 1
        chainedTxs[0], // 4
        defiTxs[2], // 2
        defiTxs[3], // 3
        chainedTxs[1], // 5
        chainedTxs[2], // 6
        chainedTxs[3], // 7
        normalTxs[0], // 9
        normalTxs[1], // 10
        normalTxs[2], // 11
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupCreator.create.mock.calls[0][0]).toEqual([
        defiTxs[0],
        defiTxs[1],
        chainedTxs[0],
        defiTxs[2],
        defiTxs[3],
        chainedTxs[1],
        chainedTxs[3],
        normalTxs[0],
      ]);
    });
  });

  describe('flushTxs', () => {
    const flush = true;

    it('should do nothing if txs is empty', async () => {
      const rp = await coordinator.processPendingTxs([], flush);
      expect(rp.published).toBe(false);
      expect(coordinator.processedTxs).toEqual([]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should aggregate and publish all txs', async () => {
      const pendingTxs = [mockTx(0)];
      const rp = await coordinator.processPendingTxs(pendingTxs, flush);
      expect(rp.published).toBe(true);
      expect(coordinator.processedTxs).toEqual(pendingTxs);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should aggregate and publish all txs 2', async () => {
      const pendingTxs = [mockTx(0), mockTx(1)];
      let rp = await coordinator.processPendingTxs(pendingTxs, flush);
      expect(rp.published).toBe(false);
      expect(coordinator.processedTxs).toEqual(pendingTxs);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
      // calling again with an empty set of pending txs causes the rollup to be published
      rp = await coordinator.processPendingTxs([], flush);
      expect(rp.published).toBe(true);
      expect(coordinator.processedTxs).toEqual(pendingTxs);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should flush a defi tx', async () => {
      const pendingTxs = [
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[2].bridgeId),
          bridgeConfigs[2].bridgeId,
        ),
      ];
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // run again but this time flush
      rp = await coordinator.processPendingTxs(pendingTxs, flush);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([1]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeConfigs[2].bridgeId,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
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
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
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
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
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
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expect(coordinator.processedTxs).toEqual(pendingTxs);
      expect(rollupCreator.create).toHaveBeenCalledTimes(numOuterRollupProofs);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });
  });

  describe('maximum assets', () => {
    const numInnerRollupTxs = 8;
    const numOuterRollupProofs = 4;

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
        bridgeResolver as any,
        feeResolver as any,
        defiInteractionNotes,
      );
    });
    /*     it('non-fee paying assets do not contribute to asset limit', async () => {
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) =>
        mockTx(i, { txFeeAssetId: i + NON_FEE_PAYING_ASSET }),
      );
      pendingTxs[pendingTxs.length - 1] = mockTx(pendingTxs.length - 1, { txFeeAssetId: 0 });
      pendingTxs[pendingTxs.length - 2] = mockTx(pendingTxs.length - 2, { txFeeAssetId: 1 });
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(coordinator.processedTxs).toEqual(pendingTxs);
      expect(rollupCreator.create).toHaveBeenCalledTimes(numOuterRollupProofs);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.getRollupBenificiary).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0, 1]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([...Array(4).fill(0n)]);
    }); */

    /*     it('non-fee paying assets do not contribute to asset limit 2', async () => {
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => {
        if (i % 2 === 0) {
          return mockTx(i, { txFeeAssetId: i + NON_FEE_PAYING_ASSET });
        }
        return mockDefiBridgeTx(i, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeConfigs[0].bridgeId), bridgeConfigs[0].bridgeId, i + NON_FEE_PAYING_ASSET);
      });
      pendingTxs[pendingTxs.length - 1] = mockTx(pendingTxs.length - 1, { txFeeAssetId: 0 });
      pendingTxs[pendingTxs.length - 2] = mockTx(pendingTxs.length - 2, { txFeeAssetId: 1 });
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(coordinator.processedTxs).toEqual(pendingTxs);
      expect(rollupCreator.create).toHaveBeenCalledTimes(numOuterRollupProofs);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.getRollupBenificiary).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0, 1]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([bridgeConfigs[0].bridgeId, ...Array(3).fill(0n)]);
    }); */
  });
});

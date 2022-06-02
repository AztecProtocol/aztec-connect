import { toBigIntBE, toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { BridgeConfig } from '@aztec/barretenberg/rollup_provider';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { randomBytes } from 'crypto';
import { BridgeResolver } from '../bridge';
import { TxDao } from '../entity/tx';
import { RollupAggregator } from '../rollup_aggregator';
import { RollupCreator } from '../rollup_creator';
import { RollupPublisher } from '../rollup_publisher';
import { TxFeeResolver } from '../tx_fee_resolver';
import { PublishTimeManager, RollupTimeout, RollupTimeouts } from './publish_time_manager';
import { RollupCoordinator } from './rollup_coordinator';

jest.useFakeTimers();

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

const bridgeConfigs: BridgeConfig[] = [
  {
    bridgeId: 1n,
    numTxs: 5,
    gas: 1000000,
    rollupFrequency: 2,
  },
  {
    bridgeId: 2n,
    numTxs: 10,
    gas: 5000000,
    rollupFrequency: 3,
  },
  {
    bridgeId: 3n,
    numTxs: 3,
    gas: 90000,
    rollupFrequency: 4,
  },
  {
    bridgeId: 4n,
    numTxs: 6,
    gas: 3000000,
    rollupFrequency: 1,
  },
  {
    bridgeId: 5n,
    numTxs: 2,
    gas: 8000000,
    rollupFrequency: 7,
  },
  {
    bridgeId: 6n,
    numTxs: 20,
    gas: 3000000,
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
      gas: 90000, // arbitrary
      rollupFrequency: 4, // arbitrary
    });
  }
};
padBridgeConfigs();

const BASE_GAS = 20000;
const NON_DEFI_TX_GAS = 100000;
const DEFI_TX_GAS = 50000;
const DEFI_TX_PLUS_BASE_GAS = BASE_GAS + DEFI_TX_GAS;
const HUGE_GAS = 10000000;

const NON_FEE_PAYING_ASSET = 999;

const getBridgeCost = (bridgeId: bigint) => {
  const bridgeConfig = bridgeConfigs.find(bc => bc.bridgeId === bridgeId);
  if (!bridgeConfig) {
    throw new Error(`Requested cost for invalid bridge ID: ${bridgeId.toString()}`);
  }
  return bridgeConfig.gas;
};

const getSingleBridgeCost = (bridgeId: bigint) => {
  const bridgeConfig = bridgeConfigs.find(bc => bc.bridgeId === bridgeId);
  if (!bridgeConfig) {
    throw new Error(`Requested cost for invalid bridge ID: ${bridgeId.toString()}`);
  }
  const { gas, numTxs } = bridgeConfig;
  const single = gas / numTxs;
  return gas % numTxs ? single + 1 : single;
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
      excessGas = 0,
      creationTime = new Date(new Date('2021-06-20T11:43:00+01:00').getTime() + id), // ensures txs are ordered by id
      bridgeId = new BridgeId(randomInt(), 1, 0).toBigInt(),
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
      excessGas,
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

  const mockDefiBridgeTx = (id: number, gas: number, bridgeId: bigint, assetId = 0) =>
    mockTx(id, {
      txType: TxType.DEFI_DEPOSIT,
      excessGas: gas - (DEFI_TX_PLUS_BASE_GAS + feeResolver.getSingleBridgeTxGas(bridgeId)),
      txFeeAssetId: assetId,
      bridgeId,
    });

  const expectProcessedTxIds = (txIds: number[]) => {
    expect(coordinator.getProcessedTxs().map(tx => tx.id)).toEqual(txIds.map(id => Buffer.from([id])));
  };

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => getCurrentTime().getTime());

    jest.spyOn(console, 'log').mockImplementation(() => {});

    publishTimeManager = {
      calculateLastTimeouts: jest.fn().mockImplementation(() => rollupTimeouts),
      calculateNextTimeouts: jest.fn(),
    };

    rollupCreator = {
      create: jest.fn(),
      interrupt: jest.fn(),
      createRollup: jest
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
      addRollupProofs: jest.fn(),
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
      defaultDefiBatchSize: 5,
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
      expect(coordinator.getProcessedTxs()).toEqual([]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should do nothing if txs are not enough to create an inner proof', async () => {
      const pendingTxs = [...Array(numInnerRollupTxs - 1)].map((_, i) => mockTx(i));
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expect(coordinator.getProcessedTxs()).toEqual([]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should aggregate and publish if txs is full', async () => {
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => mockTx(i));
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(coordinator.getProcessedTxs()).toEqual(pendingTxs);
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
        pendingTxs.push(mockDefiBridgeTx(i, HUGE_GAS, bridgeId));
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

      expect(coordinator.getProcessedTxs()).toEqual(expectedTxs);
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
      // Create 65 mock txs to slightly exceed the 2x32 rollup size (as one of the defi txs will be rejected by the
      // coordinator for exceeding the maxNumberOfBridgeCalls, but we still need to fill the rollup).
      const numTxsInRollup = numInnerRollupTxs * numOuterRollupProofs;

      // we will create one extra bridge transaction at index 64 (the 65th transaction).  otherwise every
      // even slot will contain the bridge transactions.
      for (let i = 0; i < numTxsInRollup + 1; i++) {
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
          mockDefiBridgeTx(i, DEFI_TX_PLUS_BASE_GAS + bridgeConfigs[index].gas, bridgeConfigs[index].bridgeId),
        );
        j++;
      }

      // verify that our last (64th index) entry is the invalid bridge contract, because we can
      // only have 32 in total
      expect(allTxs[64].txType === TxType.DEFI_DEPOSIT);

      // we swap the last invalid transaction with its predecessor and the expect this to essentially
      // be swapped back as the bridge wont have been rolled up into the transaction

      // So the tx ordering is: defi, normal, defi, normal,..., defi, normal, DEFI WITH BAD BRIDGE ID.
      // We want the test to _attempt_ to insert the defi tx with a 'bad' bridgeId (which will be rejected).
      // Then we want the test to instead insert the normal tx as part of the batch.

      const pendingTxs = [...allTxs.slice(0, numTxsInRollup - 1), allTxs[64], allTxs[63]];

      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);

      const expectedTxs = [...allTxs.slice(0, numTxsInRollup)];
      expect(coordinator.getProcessedTxs()).toEqual(expectedTxs);

      expect(rollupCreator.create).toHaveBeenCalledTimes(2);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);

      // we expect everything to have been processed except the bridge tx which represents the 33rd bridge
      // to be added (since the system is defined as only accepting 32 bridges per rollup)
      // see RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK

      expect(coordinator.getProcessedTxs()).toEqual(allTxs.slice(0, numTxsInRollup));
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
        pendingTxs.push(mockDefiBridgeTx(i, HUGE_GAS, bridgeId));
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

      expect(coordinator.getProcessedTxs()).toEqual(expectedTxs);
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
        mockDefiBridgeTx(2, HUGE_GAS, bridgeConfigs[0].bridgeId, 0),
        mockTx(3, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
        mockTx(4, { txType: TxType.WITHDRAW_TO_CONTRACT, txFeeAssetId: 0 }),
        mockTx(5, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
        mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(7, { txType: TxType.WITHDRAW_TO_WALLET, txFeeAssetId: 0 }),
        mockTx(8, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
        mockDefiBridgeTx(9, HUGE_GAS, bridgeConfigs[0].bridgeId, 0),
        mockTx(10, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(coordinator.getProcessedTxs()).toEqual([
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
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeId);

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
      expectProcessedTxIds([]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('will rollup defi txs once the bridge is profitable', async () => {
      const bridgeId = bridgeConfigs[2].bridgeId;
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeId);

      let pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(2, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockTx(4, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(5, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];

      // the bridge txs wouldnt be covered as we are missing 1 bridge tx and the normal txs we
      // still only have 2x2 when when we needed 4x2 so nothing will be published
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      // then we get some more txs. Of course we still have the defis from before
      pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(2, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockTx(4, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(5, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
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

    it('will add defi txs to a bridge queue if the bridge is not in the config', async () => {
      const bridgeId = 12345678n;
      const mockBridgeGas = 10000000;
      const defaultDeFiBatchSize = 8;
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeId);
      feeResolver.getSingleBridgeTxGas.mockReturnValue(mockBridgeGas / defaultDeFiBatchSize);
      feeResolver.getFullBridgeGas.mockReturnValue(mockBridgeGas);
      const pendingTxs = [
        mockDefiBridgeTxLocal(0, DEFI_TX_PLUS_BASE_GAS + feeResolver.getSingleBridgeTxGas(bridgeId)),
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + feeResolver.getSingleBridgeTxGas(bridgeId)),
        mockDefiBridgeTxLocal(2, DEFI_TX_PLUS_BASE_GAS + feeResolver.getSingleBridgeTxGas(bridgeId)),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + feeResolver.getSingleBridgeTxGas(bridgeId)),
        mockDefiBridgeTxLocal(4, DEFI_TX_PLUS_BASE_GAS + feeResolver.getSingleBridgeTxGas(bridgeId)),
        mockDefiBridgeTxLocal(5, DEFI_TX_PLUS_BASE_GAS + feeResolver.getSingleBridgeTxGas(bridgeId)),
        mockDefiBridgeTxLocal(6, DEFI_TX_PLUS_BASE_GAS + feeResolver.getSingleBridgeTxGas(bridgeId)),
        mockDefiBridgeTxLocal(7, DEFI_TX_PLUS_BASE_GAS + feeResolver.getSingleBridgeTxGas(bridgeId)),
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);

      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1, 2, 3, 4, 5, 6, 7]);
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
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeId);

      const pendingTxs = [
        mockDefiBridgeTxLocal(0, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockDefiBridgeTxLocal(4, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        mockTx(5, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);
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

    it('will fill bridge batch even after batch is profitable', async () => {
      const bridgeId = bridgeConfigs[2].bridgeId;
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeId);

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
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeId);

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
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeId);

      let pendingTxs = [
        mockDefiBridgeTxLocal(0, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeId)),
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
      ];
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // simply put we didnt have enough fee to cover the cost of the rollup above
      // so by adding in more bridge txs and some transfer (payment) txs we should
      // be able to cover it.  bridge id 0 has a very high cost compared to bridge id
      // 2 so it will not make it into this transaction, we verify at the end

      pendingTxs = [
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
        // we dont need these extra bridge transaction as bridge id 2 only requires 3 txs
        // to be profitable
        //mockDefiBridgeTxLocal(6, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
        //mockDefiBridgeTxLocal(7, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
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
      //expectProcessedTxIds([0, 1, 3, 4, 6, 7, 8, 10]);
      expectProcessedTxIds([0, 1, 3, 4, 8, 10]);

      //expect(rollupCreator.create).toHaveBeenCalledTimes(4);
      expect(rollupCreator.create).toHaveBeenCalledTimes(3);
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
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeId);

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
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeId);

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
      expect(coordinator.getProcessedTxs()).toEqual(pendingTxs);
      expect(rollupCreator.create).toHaveBeenCalledTimes(numOuterRollupProofs);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([...Array(numberOfBridgeCalls).fill(0n)]);
    });

    it('single defi tx can publish if it covers rollup + bridge costs', async () => {
      let fullCost = (numInnerRollupTxs * numOuterRollupProofs - 1) * BASE_GAS; // all other slots
      fullCost += DEFI_TX_PLUS_BASE_GAS + bridgeConfigs[1].gas; // our slot
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
      let almostFullCost = (numInnerRollupTxs * numOuterRollupProofs - 3) * BASE_GAS; // pays for all but 3 slots
      almostFullCost += DEFI_TX_PLUS_BASE_GAS + bridgeConfigs[1].gas; // pays for defi deposit slot + whole bridge
      const pendingTxs = [
        mockDefiBridgeTx(0, almostFullCost, bridgeConfigs[1].bridgeId),
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      // nothing has been created
      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // now add the required 3rd tx back in to cover the base fee we took out from almostFullCost -3
      pendingTxs.push(mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: 0 }));

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
      let almostFullCost = (numInnerRollupTxs * numOuterRollupProofs - 2) * BASE_GAS; // pays for all but 2 slots
      almostFullCost += DEFI_TX_PLUS_BASE_GAS + bridgeConfigs[1].gas; // pays for defi deposit slot + whole bridge

      // we have removed the base cost of 2 txs above from the excess which we have compensated for
      // as per the calculation that happens inside mockDefiBridgeTx() but then we add the defi tx
      // and a transfer tx back in to cover these missing costs.
      const pendingTxs = [
        mockDefiBridgeTx(0, almostFullCost, bridgeConfigs[1].bridgeId),
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1]);

      // 1 inner rollup has been created
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('single defi tx can publish if it covers rollup + bridge costs 3', async () => {
      let almostFullCost = (numInnerRollupTxs * numOuterRollupProofs - 1) * BASE_GAS; // needs 1 more tx to make profitable
      almostFullCost += DEFI_TX_PLUS_BASE_GAS + bridgeConfigs[1].gas; // bridge cost

      // in the mockDefiBridgeTx helper here we will calculate excessGas as:
      // excessGas: fee - (DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeId)),
      // so rather than change all the tests, we add this amount back in to the almostFullCost
      // above to compensate, with the additon that we are adding the full bridge tx cost
      // rather than the single bridge tx cost (which would be the bridge fee/no of bridge txs)

      // so what we should end up with here as the excess is just the bridge fee, which is
      // exactly what we want.
      {
        const pendingTxs = [mockDefiBridgeTx(0, almostFullCost, bridgeConfigs[1].bridgeId)];

        const rp = await coordinator.processPendingTxs(pendingTxs);
        expect(rp.published).toBe(true);
        expectProcessedTxIds([0]);

        // 1 inner rollup has been created
        expect(rollupCreator.create).toHaveBeenCalledTimes(1);
        expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
        expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      }

      // since we expect above that we have exactly covered the bridge cost, lets verify by
      // subtracting a single gas from the tx and check that it fails
      {
        almostFullCost -= 1;
        const pendingTxs = [mockDefiBridgeTx(0, almostFullCost, bridgeConfigs[1].bridgeId)];

        const rp = await coordinator.processPendingTxs(pendingTxs);
        expect(rp.published).toBe(false);
      }
    });

    it('single payment tx can publish if it covers complete cost', async () => {
      const fullCost = (numInnerRollupTxs * numOuterRollupProofs - 1) * BASE_GAS; // excess gas is all other slots
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
      // in this test we supply a single transaction whos excess fee is the entire cost of the transaction
      // minus 1.  but when we add the transaction, its fee is the fee for the tx itself (+1) and the excess
      // so we should have enough to cover the entire transaction.

      const fullCost = (numInnerRollupTxs * numOuterRollupProofs - 1) * BASE_GAS; // excess gas is all other slots
      const pendingTxs = [mockTx(0, { txType: TxType.TRANSFER, excessGas: fullCost, txFeeAssetId: 0 })];

      // we used to add this extra tx here, but actually its not required as the first tx itself plus its
      // excess should be enough to cover this transaction.
      //mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),

      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('single payment tx can publish if it covers complete cost 3', async () => {
      // one of these txs is a whale and will pay for all the empty slots in the transaction
      // forcing it to be published immediately.
      // the base gas cost is the cost of the verifier divided by the number of slots in the
      // rollup. for a payment transaction i.e. something that is non defi, is the share of
      // the verifer plus the cost of the tx, and for defi there is an adiditonal bridge cost.

      // costs = share of the verifieer + cost associated with what its trying to do (i.e. payment vs
      // account vs deposit vs defi) + (for defi transactions only, an additional bridge cost)

      let fullCost = (numInnerRollupTxs * numOuterRollupProofs - 3) * BASE_GAS; // full base cost of rollup

      // we are only adding 2 txs but we have subtracted the cost of 3 txs from the full cost we are going
      // to supply as eccess.  we can either add another 3rd transaction to cover this, or restore the
      // missing fee here as NON_DEFI_TX_GAS
      fullCost += NON_DEFI_TX_GAS; // payment tx cost

      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, excessGas: fullCost, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];

      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('defi txs are not published if bridge is not profitable, even if rollup is', async () => {
      const fullCost = (numInnerRollupTxs * numOuterRollupProofs - 1) * BASE_GAS; // excess gas is all other slots
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
      const pendingTxs = [
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
        mockTx(9, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(10, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(11, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(12, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(13, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];

      //   {
      //   bridgeId: 4n,
      //   numTxs: 6,
      //   fee: 3000000n,
      //   rollupFrequency: 1,
      // },

      // bridge[3] requires 6 transactions to be profitable so we expect it not to be
      // inlcuded in any of the rollups here.  fees are calculated by the bridge fee
      // divided by the number of required txs (in this case 6). so unless an idividual
      // transaction comes through with a higher fee (whale) we wont process these.  this
      // is explored further in other tests...

      // bridge [2] got in meaning bridge [3] couldn't as there isn't enough room
      // we can only rollup the first 2 txs for bridge [2] here
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1, 7, 9, 10, 11, 12, 13]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(4);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
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
      expectProcessedTxIds([]);

      // rollups are not created until shouldPublish=true, then we process
      // all txs at once in parallel
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

      // run again, with no pending txs and we will publish
      rp = await coordinator.processPendingTxs(pendingTxs);
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
      let rp = await coordinator.processPendingTxs([]);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      // txs have been rolled up but not published
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

      // run again, with no pending txs and we will publish
      rp = await coordinator.processPendingTxs(pendingTxs);
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
      rp = await await coordinator.processPendingTxs(pendingTxs);
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
          const { bridgeId, gas } = bridgeConfigs[index];
          allTxs.push(mockDefiBridgeTx(i, DEFI_TX_PLUS_BASE_GAS + gas, bridgeId));
          j++;
        }

        // Note:
        //   allTxs[32] contains bridgeId 33
        //   allTxs[33] contains bridgeId 34

        const pendingTxs = allTxs;

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

        // this call will trigger the rollup
        const rp = await coordinator.processPendingTxs(pendingTxs);
        expect(rp.published).toBe(true);

        // Expect all txs but those with bridgeId = 33 or 34.
        const expectedTxs = pendingTxs.filter(tx => {
          const proof = new ProofData(tx.proofData);
          // We can safely coerce to a number, because we know these are small numbers in this test:
          const bid = Number(BridgeId.fromBuffer(proof.bridgeId).toBigInt());
          // ... except for the non-defi txs, which have huge bridgeIds (much greater than 1000, say):
          return bid <= numberOfBridgeCalls || bid > 1000;
        });

        expect(coordinator.getProcessedTxs()).toEqual(expectedTxs);

        expect(rollupCreator.create).toHaveBeenCalledTimes(2);
        expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
        expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);

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
        .map((bc, i) => mockDefiBridgeTx(i, bc.gas + DEFI_TX_PLUS_BASE_GAS, bc.bridgeId));

      // Create a chain of 4 txs. The 3rd one is a defi deposit tx.
      const commitments = [...Array(4)].map(() => randomBytes(32));
      const chainedTxs = commitments.slice(0, 4).map((noteCommitment2, i) =>
        mockTx(i + 4, {
          noteCommitment2,
          backwardLink: i ? commitments[i - 1] : Buffer.alloc(32),
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
      const rp = await coordinator.processPendingTxs(pendingTxs, true);
      expect(rp.published).toBe(true);
      expect(rollupCreator.create).toHaveBeenCalledTimes(2);
      expect(rollupCreator.create.mock.calls[0][0]).toEqual([
        defiTxs[0],
        defiTxs[1],
        chainedTxs[0],
        defiTxs[2],
        defiTxs[3],
        chainedTxs[1],
        chainedTxs[2],
        chainedTxs[3],
      ]);
    });
  });

  describe('flushTxs', () => {
    const flush = true;

    it('should do nothing if txs is empty', async () => {
      const rp = await coordinator.processPendingTxs([], flush);
      expect(rp.published).toBe(false);
      expect(coordinator.getProcessedTxs()).toEqual([]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should aggregate and publish all txs', async () => {
      const pendingTxs = [mockTx(0)];
      const rp = await coordinator.processPendingTxs(pendingTxs, flush);
      expect(rp.published).toBe(true);
      expect(coordinator.getProcessedTxs()).toEqual(pendingTxs);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should aggregate and publish all txs 2', async () => {
      const pendingTxs = [mockTx(0), mockTx(1)];
      const rp = await coordinator.processPendingTxs(pendingTxs, flush);
      // There is no longer any delay on processing pending transactions as we do them
      // all in one parallel batch.  So this should publish immediately due to flush=true
      // triggering the shouldPublish condition
      expect(rp.published).toBe(true);
      expect(coordinator.getProcessedTxs()).toEqual(pendingTxs);
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
        throw new Error('Creator Error');
      });
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => mockTx(i));
      try {
        await coordinator.processPendingTxs(pendingTxs);
      } catch (err) {
        expect(err).toBeDefined();
        expect(err.message).toBe('Creator Error');
      }
    });

    it('should not publish if rollupAggregator is interrupted', async () => {
      rollupAggregator.aggregateRollupProofs.mockImplementation(() => {
        throw new Error('Aggregator Error');
      });

      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => mockTx(i));
      try {
        await coordinator.processPendingTxs(pendingTxs);
      } catch (err) {
        expect(err).toBeDefined();
        expect(err.message).toBe('Aggregator Error');
      }
    });

    it('should not throw if rollupPublisher is interrupted', async () => {
      rollupPublisher.publishRollup.mockImplementation(() => {
        throw new Error('Publisher Error');
      });
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => mockTx(i));
      try {
        await coordinator.processPendingTxs(pendingTxs);
      } catch (err) {
        expect(err).toBeDefined();
        expect(err.message).toBe('Publisher Error');
      }
    });
  });
});

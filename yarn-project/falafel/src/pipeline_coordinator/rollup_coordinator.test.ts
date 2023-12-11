import { toBigIntBE, toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { BridgeSubsidy, TxType } from '@aztec/barretenberg/blockchain';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { InterruptError } from '@aztec/barretenberg/errors';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { BridgeConfig } from '@aztec/barretenberg/rollup_provider';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { randomBytes } from 'crypto';
import { BridgeResolver } from '../bridge/index.js';
import { TxDao } from '../entity/index.js';
import { Metrics } from '../metrics/index.js';
import { RollupAggregator } from '../rollup_aggregator.js';
import { RollupCreator } from '../rollup_creator.js';
import { RollupDb } from '../rollup_db/index.js';
import { RollupPublisher } from '../rollup_publisher.js';
import { TxFeeResolver } from '../tx_fee_resolver/index.js';
import { PublishTimeManager, RollupTimeouts } from './publish_time_manager.js';
import { RollupCoordinator } from './rollup_coordinator.js';
import { jest } from '@jest/globals';

jest.useFakeTimers({ doNotFake: ['performance'] });

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

const bridgeConfigs: BridgeConfig[] = [
  {
    bridgeAddressId: 1,
    numTxs: 5,
    gas: 1000000,
    permittedAssets: [0, 1],
  },
  {
    bridgeAddressId: 2,
    numTxs: 10,
    gas: 5000000,
    permittedAssets: [0, 1],
  },
  {
    bridgeAddressId: 3,
    numTxs: 3,
    gas: 90000,
    permittedAssets: [0, 1],
  },
  {
    bridgeAddressId: 4,
    numTxs: 6,
    gas: 3000000,
    permittedAssets: [0, 1],
  },
  {
    bridgeAddressId: 5,
    numTxs: 2,
    gas: 8000000,
    permittedAssets: [0, 1],
  },
  {
    bridgeAddressId: 6,
    numTxs: 20,
    gas: 3000000,
    permittedAssets: [0, 1],
  },
];

const numberOfBridgeCalls = RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK;

// When we updated the numberOfBridgeCalls from 4 to 32, we needed _way_ more bridge configs.
// Since only the first 6 (instantiated above) need bespoke values for various tests, we'll pad with the same values here.
const padBridgeConfigs = () => {
  // some tests need >numberOfBridgeCalls bridge calls so we'll add numberOfBridgeCalls configs on top of the existing 6.
  for (let i = 1; i <= numberOfBridgeCalls + 1; i++) {
    bridgeConfigs.push({
      bridgeAddressId: i + 6,
      numTxs: 1, // arbitrary
      gas: 90000, // arbitrary
      permittedAssets: [0, 1], // arbitrary
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

const SECOND_CLASS_ID_OFFSET = 100;

const getBridgeCost = (bridgeCallData: bigint) => {
  const bridgeConfig = bridgeConfigs.find(
    bc => bc.bridgeAddressId === BridgeCallData.fromBigInt(bridgeCallData).bridgeAddressId,
  );
  if (!bridgeConfig) {
    throw new Error(`Requested cost for invalid bridgeCallData: ${bridgeCallData.toString()}`);
  }
  return bridgeConfig.gas!;
};

const getSingleBridgeCost = (bridgeCallData: bigint) => {
  const bridgeConfig = bridgeConfigs.find(
    bc => bc.bridgeAddressId === BridgeCallData.fromBigInt(bridgeCallData).bridgeAddressId,
  );
  if (!bridgeConfig) {
    throw new Error(`Requested cost for invalid bridgeCallData: ${bridgeCallData.toString()}`);
  }
  const { gas, numTxs } = bridgeConfig;
  return Math.ceil(gas! / numTxs);
};

const generateValidBridgeCallData = (bridgeConfig: BridgeConfig) => {
  return new BridgeCallData(
    bridgeConfig.bridgeAddressId,
    bridgeConfig.permittedAssets[0],
    bridgeConfig.permittedAssets[1],
    undefined,
    undefined,
    0n,
  );
};

const generateBridgeSubsidy = (subsidyGas: number, bridgeCallData: bigint, criteria: bigint) => {
  const fullCallData = BridgeCallData.fromBigInt(bridgeCallData);
  return {
    subsidyInGas: subsidyGas,
    subsidyInWei: BigInt(subsidyGas * 1000),
    criteria,
    addressId: fullCallData.bridgeAddressId,
  } as BridgeSubsidy;
};

const bridgeCallDatas = bridgeConfigs.map(bc => generateValidBridgeCallData(bc));

const randomInt = (to = 2 ** 32 - 1) => Math.floor(Math.random() * (to + 1));

describe('rollup_coordinator', () => {
  const numInnerRollupTxs = 2;
  const numOuterRollupProofs = 4;
  const oldDefiRoot = randomBytes(32);
  const oldDefiPath = new HashPath([]);
  const defiInteractionNotes: DefiInteractionNote[] = [];
  const maxGasForRollup = 100000000;
  const callDataPerRollup = 128 * 1024;
  let publishTimeManager: Mockify<PublishTimeManager>;
  let rollupCreator: Mockify<RollupCreator>;
  let rollupAggregator: Mockify<RollupAggregator>;
  let rollupPublisher: Mockify<RollupPublisher>;
  let rollupDb: Mockify<RollupDb>;
  let feeResolver: Mockify<TxFeeResolver>;
  let bridgeResolver: Mockify<BridgeResolver>;
  let coordinator: RollupCoordinator;
  let metrics: Mockify<Metrics>;

  const newRollupCoordinator = (
    numInnerRollupTxs: number,
    numOuterRollupProofs: number,
    maxGasForRollup_ = maxGasForRollup,
    callDataPerRollup_ = callDataPerRollup,
  ) =>
    new RollupCoordinator(
      publishTimeManager as any,
      rollupCreator as any,
      rollupAggregator as any,
      rollupPublisher as any,
      rollupDb as any,
      numInnerRollupTxs,
      numOuterRollupProofs,
      oldDefiRoot,
      oldDefiPath,
      bridgeResolver as any,
      feeResolver as any,
      defiInteractionNotes,
      maxGasForRollup_,
      callDataPerRollup_,
      metrics as any,
      () => {},
    );

  let currentTime = new Date('2021-06-20T11:45:00+01:00');

  const getCurrentTime = () => currentTime;

  let rollupTimeouts: RollupTimeouts = {
    baseTimeout: { timeout: new Date('2021-06-20T10:00:00+00:00'), rollupNumber: 1 },
  };

  const callDataValues: { [key: number]: number } = {
    0: 100,
    1: 100,
    2: 100,
    3: 100,
    4: 100,
    5: 100,
    6: 100,
  };

  const gasValues: { [key: number]: number } = {
    0: 100,
    1: 100,
    2: 100,
    3: 100,
    4: 100,
    5: 100,
    6: 100,
  };

  const bridgeContractGasLimits: Map<bigint, number> = new Map<bigint, number>();

  const resetGasAndDataValues = () => {
    for (let i = 0; i < 7; i++) {
      callDataValues[i] = 100;
      gasValues[i] = 100;
    }
  };

  const txTypeToProofId = (txType: TxType) => (txType < TxType.WITHDRAW_HIGH_GAS ? txType + 1 : txType);

  const mockTx = (
    id: number,
    {
      txType = TxType.TRANSFER,
      txFeeAssetId = 0,
      excessGas = 0,
      creationTime = new Date(new Date('2021-06-20T11:43:00+01:00').getTime() + id), // ensures txs are ordered by id
      bridgeCallData = new BridgeCallData(randomInt(), 1, 0).toBigInt(),
      noteCommitment1 = randomBytes(32),
      noteCommitment2 = randomBytes(32),
      backwardLink = Buffer.alloc(32),
      allowChain = numToUInt32BE(2, 32),
      secondClass = false,
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
        toBufferBE(bridgeCallData, 32),
        randomBytes(2 * 32),
        backwardLink,
        allowChain,
      ]),
      secondClass,
    } as any as TxDao);

  const mockDefiBridgeTx = (id: number, gas: number, bridgeCallData: bigint, assetId = 0, creationTime?: Date) =>
    mockTx(id, {
      txType: TxType.DEFI_DEPOSIT,
      excessGas: gas - (DEFI_TX_PLUS_BASE_GAS + feeResolver.getSingleBridgeTxGas(bridgeCallData)),
      txFeeAssetId: assetId,
      bridgeCallData,
      creationTime,
    });

  const mockSecondClassTxs = (count: number) =>
    [...Array(count)].map((_, i) => mockTx(i + SECOND_CLASS_ID_OFFSET, { txType: TxType.ACCOUNT, secondClass: true }));

  const expectProcessedTxIds = (txIds: number[]) => {
    expect(coordinator.getProcessedTxs().map(tx => tx.id)).toEqual(txIds.map(id => Buffer.from([id])));
  };

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => getCurrentTime().getTime());

    publishTimeManager = {
      calculateLastTimeouts: jest.fn(() => rollupTimeouts),
      calculateNextTimeouts: jest.fn(),
    } as Mockify<PublishTimeManager>;

    rollupCreator = {
      create: jest.fn(),
      interrupt: jest.fn(),
      createRollup: jest.fn((txs: TxDao[], rootRollupBridgeCallDatas: bigint[], rootRollupAssetIds: Set<number>) => {
        for (const tx of txs) {
          const proof = new ProofData(tx.proofData);
          if (proof.proofId === ProofId.ACCOUNT) {
            continue;
          }
          const asset = proof.feeAssetId;
          if (feeResolver.isFeePayingAsset(asset)) {
            rootRollupAssetIds.add(asset);
          }
          if (proof.proofId !== ProofId.DEFI_DEPOSIT) {
            continue;
          }
          const proofBridgeCallData = toBigIntBE(proof.bridgeCallData);
          if (rootRollupBridgeCallDatas.findIndex(bridge => bridge === proofBridgeCallData) === -1) {
            rootRollupBridgeCallDatas.push(proofBridgeCallData);
          }
        }
      }),
    } as Mockify<RollupCreator>;

    rollupAggregator = {
      aggregateRollupProofs: jest.fn<any>().mockResolvedValue(Buffer.alloc(0)),
      interrupt: jest.fn(),
    } as Mockify<RollupAggregator>;

    rollupPublisher = {
      publishRollup: jest.fn<any>().mockResolvedValue(true),
      interrupt: jest.fn(),
    } as Mockify<RollupPublisher>;

    rollupDb = {
      getPendingTxCount: jest.fn<any>().mockResolvedValue(0),
      getPendingSecondClassTxCount: jest.fn<any>().mockResolvedValue(0),
      deleteUnsettledRollups: jest.fn(),
      deleteOrphanedRollupProofs: jest.fn(),
      deleteUnsettledClaimTxs: jest.fn(),
      getLastSettledRollup: jest.fn<any>().mockResolvedValue(undefined),
      getPendingTxs: jest.fn<any>().mockResolvedValue([]),
      getPendingSecondClassTxs: jest.fn<any>().mockResolvedValue([]),
    } as any;

    feeResolver = {
      start: jest.fn(),
      stop: jest.fn(),
      getGasPaidForByFee: jest.fn((assetId: number, fee: bigint) => fee),
      getTxFeeFromGas: jest.fn((assetId: number, gas: bigint) => gas),
      getUnadjustedBaseVerificationGas: jest.fn().mockReturnValue(BASE_GAS),
      getAdjustedBaseVerificationGas: jest.fn().mockReturnValue(BASE_GAS),
      getAdjustedTxGas: jest.fn((_, txType: TxType) => gasValues[txType]),
      getUnadjustedTxGas: jest.fn((_, txType: TxType) => gasValues[txType]),
      getAdjustedBridgeTxGas: jest.fn(),
      getUnadjustedBridgeTxGas: jest.fn(),
      getFullBridgeGas: jest.fn((bridgeCallData: bigint) => getBridgeCost(bridgeCallData)),
      getSingleBridgeTxGas: jest.fn((bridgeCallData: bigint) => getSingleBridgeCost(bridgeCallData)),
      getTxFees: jest.fn(),
      getDefiFees: jest.fn(),
      isFeePayingAsset: jest.fn((assetId: number) => assetId < 3),
      getTxCallData: jest.fn((txType: TxType) => callDataValues[txType]),
      getMaxTxCallData: jest.fn(() => Math.max(...Object.values(callDataValues))),
      getMaxUnadjustedGas: jest.fn(() => Math.max(...Object.values(gasValues))),
      getFullBridgeGasFromContract: jest.fn((bridgeId: bigint) => {
        return bridgeContractGasLimits.get(bridgeId) ?? getBridgeCost(bridgeId);
      }),
    } as Mockify<TxFeeResolver>;

    bridgeResolver = {
      getBridgeConfigs: jest.fn().mockReturnValue(bridgeConfigs),
      getBridgeDescription: jest.fn().mockReturnValue(undefined),
      getBridgeSubsidy: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ subsidyInGas: 0, subsidyInWei: 0n, addressId: 1, criteria: 1n } as BridgeSubsidy),
        ),
    } as any;

    metrics = {
      rollupPublished: jest.fn<any>().mockResolvedValue(true),
      recordRollupMetrics: jest.fn(),
    } as any;

    coordinator = newRollupCoordinator(numInnerRollupTxs, numOuterRollupProofs);
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

    it('should do nothing if txs is full with only second-class txs', async () => {
      // rollupDb should return some second-class txs for this test
      const numSecondClassTxs = numInnerRollupTxs * numOuterRollupProofs;
      rollupDb.getPendingSecondClassTxs.mockResolvedValueOnce(mockSecondClassTxs(numSecondClassTxs));
      rollupDb.getPendingSecondClassTxCount.mockResolvedValueOnce(numSecondClassTxs);

      const rp = await coordinator.processPendingTxs([]);
      expect(rp.published).toBe(false);
      expect(coordinator.getProcessedTxs()).toEqual([]);
      expect(coordinator.getProcessedTxs().filter(tx => tx.secondClass)).toEqual([]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should publish ONLY first-class txs if block is full, even when second class txs are present', async () => {
      // rollupDb should return some second-class txs for this test
      const numSecondClassTxs = numInnerRollupTxs * numOuterRollupProofs;
      rollupDb.getPendingSecondClassTxs.mockResolvedValueOnce(mockSecondClassTxs(numSecondClassTxs));
      rollupDb.getPendingSecondClassTxCount.mockResolvedValueOnce(numSecondClassTxs);

      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => mockTx(i));
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(coordinator.getProcessedTxs()).toEqual(pendingTxs);
      expect(coordinator.getProcessedTxs().filter(tx => tx.secondClass)).toEqual([]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(numOuterRollupProofs);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });
  });

  describe('number of bridge calls per block never exceeded', () => {
    // A separate describe block for these, as we need to increase the rollup topology to a 2x32 to push the numberOfBridgeCalls = 32 limit.

    const numInnerRollupTxs = numberOfBridgeCalls;
    const numOuterRollupProofs = 2;

    beforeEach(() => {
      coordinator = newRollupCoordinator(numInnerRollupTxs, numOuterRollupProofs);
    });

    it('will not rollup defi deposit proofs with more than the allowed distinct bridge call datas', async () => {
      // All defi txs have enough fee to be published independently
      const pendingTxs = [];
      let j = 1; // for incrementing the bridgeCallData
      // Create 72 mock txs to comfortably exceed the 2x32 rollup size (as some of the defi txs will be rejected by the coordinator for
      // exceeding the maxNumberOfBridgeCalls, but we still need to fill the rollup).
      for (let i = 0; i < 72; i++) {
        // Occasionally insert a regular tx, for realism. `7` chosen arbitrarily.
        if (i % 7 === 0) {
          pendingTxs.push(mockTx(i, { txType: TxType.TRANSFER, txFeeAssetId: 0 }));
          // Notice we don't increment j here, because we want the bridgeCallData for j to be included in the next iteration.
          continue;
        }
        // We'll allow the number of bridgeCallDatas to exceed the max number of bridge calls per block by 2.
        // So 2 of our txs _should_ be rejected from the first (and only) rollup of this test.
        const bridgeCallData = bridgeCallDatas[(j - 1) % (numberOfBridgeCalls + 2)]; // indices 0, 1, 2, ..., 30, 31, 32, 33.
        pendingTxs.push(mockDefiBridgeTx(i, HUGE_GAS, bridgeCallData.toBigInt()));
        j++;
      }

      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);

      // Expect all txs but those with bridgeCallData = 33 or 34.
      const expectedTxs = pendingTxs
        .filter(tx => {
          const proof = new ProofData(tx.proofData);
          // We can safely coerce to a number, because we know these are small numbers in this test:
          const bid = Number(BridgeCallData.fromBuffer(proof.bridgeCallData).bridgeAddressId);
          // ... except for the non-defi txs, which have huge bridgeCallDatas (much greater than 1000, say):
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
          .map((_, i) => bridgeCallDatas[i].toBigInt()),
      );
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('distinct bridge call datas are maintained across invocations', async () => {
      // All defi txs have enough fee to be published independently
      const allTxs = [];
      let j = 1; // for incrementing the bridgeCallData
      // Create 65 mock txs to slightly exceed the 2x32 rollup size (as one of the defi txs will be rejected by the
      // coordinator for exceeding the maxNumberOfBridgeCalls, but we still need to fill the rollup).
      const numTxsInRollup = numInnerRollupTxs * numOuterRollupProofs;

      // we will create one extra bridge transaction at index 64 (the 65th transaction).  otherwise every
      // even slot will contain the bridge transactions.
      for (let i = 0; i < numTxsInRollup + 1; i++) {
        // Alternately insert regular txs, for some realism.
        if (i % 2 === 1) {
          allTxs.push(mockTx(i, { txType: TxType.TRANSFER, txFeeAssetId: 0 }));
          // Notice we don't increment j here, because we want the bridgeCallData for j to be included in the next iteration.
          continue;
        }
        // We'll allow the number of bridgeCallDatas to exceed the max number of bridge calls per block by 1.
        // So _one_ of our txs _should_ be rejected from the first (and only) rollup of this test.
        const index = (j - 1) % (numberOfBridgeCalls + 1); // 0, 1, 2, ..., 31, 32.
        const bridgeCallData = bridgeCallDatas[index];
        allTxs.push(mockDefiBridgeTx(i, DEFI_TX_PLUS_BASE_GAS + bridgeConfigs[index].gas!, bridgeCallData.toBigInt()));
        j++;
      }

      // verify that our last (64th index) entry is the invalid bridge contract, because we can
      // only have 32 in total
      expect(allTxs[64].txType === TxType.DEFI_DEPOSIT);

      // we swap the last invalid transaction with its predecessor and the expect this to essentially
      // be swapped back as the bridge wont have been rolled up into the transaction

      // So the tx ordering is: defi, normal, defi, normal,..., defi, normal, DEFI WITH BAD BRIDGE CALL DATA.
      // We want the test to _attempt_ to insert the defi tx with a 'bad' bridgeCallData (which will be rejected).
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
          .map((_, i) => bridgeCallDatas[i].toBigInt()),
      );
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('will not flush defi deposit txs if we have more than the allowed distinct bridge call datas', async () => {
      const pendingTxs = [];
      let j = 1; // for incrementing the bridgeCallData
      // Create 72 mock txs to comfortably exceed the 2x32 rollup size (as some of the defi txs will be rejected by the coordinator for
      // exceeding the maxNumberOfBridgeCalls, but we still need to fill the rollup).
      for (let i = 1; i <= 72; i++) {
        // Occasionally insert a regular tx, for realism. `7` chosen arbitrarily.
        if (i % 7 === 0) {
          pendingTxs.push(mockTx(i, { txType: TxType.TRANSFER, txFeeAssetId: 0 }));
          // Notice we don't increment j here, because we want the bridgeCallData for j to be included in the next iteration.
          continue;
        }
        // We'll allow the number of bridgeCallDatas to exceed the max number of bridge calls per block by 2.
        // So 2 of our txs _should_ be rejected from the first (and only) rollup of this test.
        const bridgeCallData = bridgeCallDatas[(j - 1) % (numberOfBridgeCalls + 2)]; // indices 0, 1, 2, ..., 30, 31, 32, 33.
        pendingTxs.push(mockDefiBridgeTx(i, HUGE_GAS, bridgeCallData.toBigInt()));
        j++;
      }

      const rp = await coordinator.processPendingTxs(pendingTxs, true);
      expect(rp.published).toBe(true);
      // Expect all txs but those with bridgeCallData = 33 or 34.
      const expectedTxs = pendingTxs
        .filter(tx => {
          const proof = new ProofData(tx.proofData);
          // We can safely coerce to a number, because we know these are small numbers in this test:
          const bid = Number(BridgeCallData.fromBuffer(proof.bridgeCallData).bridgeAddressId);
          // ... except for the non-defi txs, which have huge bridgeCallDatas (much greater than 1000, say):
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
          .map((_, i) => bridgeCallDatas[i].toBigInt()),
      );
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });
  });

  describe('picking txs to rollup', () => {
    it('will rollup defi claim proofs first', async () => {
      const pendingTxs = [
        mockTx(0, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.ACCOUNT, txFeeAssetId: 0 }),
        mockDefiBridgeTx(2, HUGE_GAS, bridgeCallDatas[0].toBigInt(), 0),
        mockTx(3, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
        mockTx(4, { txType: TxType.WITHDRAW_HIGH_GAS, txFeeAssetId: 0 }),
        mockTx(5, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
        mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(7, { txType: TxType.WITHDRAW_TO_WALLET, txFeeAssetId: 0 }),
        mockTx(8, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
        mockDefiBridgeTx(9, HUGE_GAS, bridgeCallDatas[0].toBigInt(), 0),
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
        bridgeCallDatas[0].toBigInt(),
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it("will not rollup defi deposit proofs if the bridge isn't profitable", async () => {
      const bridgeCallData = bridgeCallDatas[0].toBigInt();
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);

      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(2, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
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
      const bridgeCallData = bridgeCallDatas[2].toBigInt();
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);

      let pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(2, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
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
        mockDefiBridgeTxLocal(2, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockTx(4, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(5, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(7, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
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
        bridgeCallData,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('will rollup defi txs if subsidised', async () => {
      const bridgeCallData = bridgeCallDatas[2].toBigInt();
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);

      let pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(2, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockTx(4, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(5, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];

      // the bridge txs wouldnt be covered as we are missing 1 bridge tx and the normal txs we
      // still only have 2x2 when when we needed 4x2 so nothing will be published
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      // then we get some more txs. Of course we still have the defis from before
      // the defis by themselves don't cover the cost of the bridge, but we will set the subsidy so that the additional cost is covered
      bridgeResolver.getBridgeSubsidy.mockImplementationOnce(() =>
        Promise.resolve(generateBridgeSubsidy(getSingleBridgeCost(bridgeCallData), bridgeCallData, 1n)),
      );
      pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(2, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockTx(3, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(4, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(5, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(7, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1, 3, 4, 2, 5, 6, 7]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(4);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallData,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('will include multiple subsidised bridges', async () => {
      // then we get some more txs. Of course we still have the defis from before
      // the defis by themselves don't cover the cost of the bridge, but we will set the subsidy so that the additional cost is covered
      // this will be called for each bridge call data value
      bridgeResolver.getBridgeSubsidy.mockImplementationOnce((bridgeCallData: bigint) =>
        Promise.resolve(generateBridgeSubsidy(getSingleBridgeCost(bridgeCallData), bridgeCallData, 1n)),
      );
      bridgeResolver.getBridgeSubsidy.mockImplementationOnce((bridgeCallData: bigint) =>
        Promise.resolve(generateBridgeSubsidy(getSingleBridgeCost(bridgeCallData), bridgeCallData, 1n)),
      );
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          3,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
        ),
        mockTx(4, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          5,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
        ),
        mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          7,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[4].toBigInt()),
          bridgeCallDatas[4].toBigInt(),
        ),
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(rp.totalTxs).toEqual(8);
      expectProcessedTxIds([0, 1, 2, 4, 3, 5, 6, 7]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(4);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallDatas[2].toBigInt(),
        bridgeCallDatas[4].toBigInt(),
        ...Array(numberOfBridgeCalls - 2).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('only one bridge call data can be subsidised per bridge address', async () => {
      // then we get some more txs. Of course we still have the defis from before
      // the defis by themselves don't cover the cost of the bridge, but we will set the subsidy so that the additional cost is covered
      // this will be called for each bridge call data value
      bridgeResolver.getBridgeSubsidy.mockImplementationOnce((bridgeCallData: bigint) =>
        Promise.resolve(generateBridgeSubsidy(getSingleBridgeCost(bridgeCallData), bridgeCallData, 1n)),
      );
      bridgeResolver.getBridgeSubsidy.mockImplementationOnce((bridgeCallData: bigint) =>
        Promise.resolve(generateBridgeSubsidy(getSingleBridgeCost(bridgeCallData), bridgeCallData, 1n)),
      );
      bridgeResolver.getBridgeSubsidy.mockImplementationOnce((bridgeCallData: bigint) =>
        Promise.resolve(generateBridgeSubsidy(getSingleBridgeCost(bridgeCallData), bridgeCallData, 1n)),
      );

      // we will create 2 sets of txs that are using bridge address id bridgeConfig[2].bridgeAddressId
      // only one will be subsidised
      const alternativeBridgeCallData = new BridgeCallData(
        bridgeConfigs[2].bridgeAddressId,
        bridgeConfigs[2].permittedAssets[1],
        bridgeConfigs[2].permittedAssets[0],
        undefined,
        undefined,
        15n,
      ).toBigInt();
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          alternativeBridgeCallData,
        ),
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          alternativeBridgeCallData,
        ),
        mockDefiBridgeTx(
          3,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
        ),
        mockTx(4, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          5,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
        ),
        mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          7,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[4].toBigInt()),
          bridgeCallDatas[4].toBigInt(),
        ),
        mockTx(8, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(9, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(rp.totalTxs).toEqual(8);
      expectProcessedTxIds([0, 1, 2, 4, 6, 7, 8, 9]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(4);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        alternativeBridgeCallData,
        bridgeCallDatas[4].toBigInt(),
        ...Array(numberOfBridgeCalls - 2).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('will add defi txs to a bridge queue if the bridge is not in the config', async () => {
      const bridgeCallData = 12345678n;
      const mockBridgeGas = 10000000;
      const defaultDeFiBatchSize = 8;
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);
      feeResolver.getSingleBridgeTxGas.mockReturnValue(mockBridgeGas / defaultDeFiBatchSize);
      feeResolver.getFullBridgeGas.mockReturnValue(mockBridgeGas);
      feeResolver.getFullBridgeGasFromContract.mockReturnValue(mockBridgeGas);
      const pendingTxs = [
        mockDefiBridgeTxLocal(0, DEFI_TX_PLUS_BASE_GAS + feeResolver.getSingleBridgeTxGas(bridgeCallData)),
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + feeResolver.getSingleBridgeTxGas(bridgeCallData)),
        mockDefiBridgeTxLocal(2, DEFI_TX_PLUS_BASE_GAS + feeResolver.getSingleBridgeTxGas(bridgeCallData)),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + feeResolver.getSingleBridgeTxGas(bridgeCallData)),
        mockDefiBridgeTxLocal(4, DEFI_TX_PLUS_BASE_GAS + feeResolver.getSingleBridgeTxGas(bridgeCallData)),
        mockDefiBridgeTxLocal(5, DEFI_TX_PLUS_BASE_GAS + feeResolver.getSingleBridgeTxGas(bridgeCallData)),
        mockDefiBridgeTxLocal(6, DEFI_TX_PLUS_BASE_GAS + feeResolver.getSingleBridgeTxGas(bridgeCallData)),
        mockDefiBridgeTxLocal(7, DEFI_TX_PLUS_BASE_GAS + feeResolver.getSingleBridgeTxGas(bridgeCallData)),
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);

      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1, 2, 3, 4, 5, 6, 7]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(4);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallData,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('will continue to add defi txs to profitable bridge', async () => {
      const bridgeCallData = bridgeCallDatas[2].toBigInt();
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);

      const pendingTxs = [
        mockDefiBridgeTxLocal(0, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockDefiBridgeTxLocal(4, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
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
        bridgeCallData,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('will fill bridge batch even after batch is profitable', async () => {
      const bridgeCallData = bridgeCallDatas[2].toBigInt();
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);

      const pendingTxs = [
        mockDefiBridgeTxLocal(0, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)),
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockTx(5, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(7, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockDefiBridgeTxLocal(8, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1, 2, 3, 5, 6, 7, 8]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(4);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallData,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('will only keep filling profitable bridge batch', async () => {
      const bridgeCallData = bridgeCallDatas[2].toBigInt();
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);

      const pendingTxs = [
        mockDefiBridgeTxLocal(0, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)),
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[0].toBigInt()),
          bridgeCallDatas[0].toBigInt(),
        ),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockTx(4, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          5,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[0].toBigInt()),
          bridgeCallDatas[0].toBigInt(),
        ),
        mockDefiBridgeTxLocal(6, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockDefiBridgeTxLocal(7, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockTx(8, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          9,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[0].toBigInt()),
          bridgeCallDatas[0].toBigInt(),
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
        bridgeCallData,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('will only keep filling profitable bridge batch across invocations', async () => {
      const bridgeCallData = bridgeCallDatas[2].toBigInt();
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);

      let pendingTxs = [
        mockDefiBridgeTxLocal(0, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)),
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
      ];
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // simply put we didnt have enough fee to cover the cost of the rollup above
      // so by adding in more bridge txs and some transfer (payment) txs we should
      // be able to cover it.  bridge call data 0 has a very high cost compared to bridge call data
      // 2 so it will not make it into this transaction, we verify at the end

      pendingTxs = [
        mockDefiBridgeTxLocal(0, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)),
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[0].toBigInt()),
          bridgeCallDatas[0].toBigInt(),
        ),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockTx(4, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          5,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[0].toBigInt()),
          bridgeCallDatas[0].toBigInt(),
        ),
        // we dont need these extra bridge transaction as bridge call data 2 only requires 3 txs
        // to be profitable
        //mockDefiBridgeTxLocal(6, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        //mockDefiBridgeTxLocal(7, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockTx(8, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          9,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[0].toBigInt()),
          bridgeCallDatas[0].toBigInt(),
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
        bridgeCallDatas[2].toBigInt(),
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('will only fill bridge batch up to rollup size', async () => {
      const bridgeCallData = bridgeCallDatas[2].toBigInt();
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);

      const pendingTxs = [
        mockDefiBridgeTxLocal(0, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)),
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[0].toBigInt()),
          bridgeCallDatas[0].toBigInt(),
        ),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockTx(4, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          5,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[0].toBigInt()),
          bridgeCallDatas[0].toBigInt(),
        ),
        mockDefiBridgeTxLocal(6, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockDefiBridgeTxLocal(7, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockTx(8, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          9,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[0].toBigInt()),
          bridgeCallDatas[0].toBigInt(),
        ),
        mockDefiBridgeTxLocal(10, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockDefiBridgeTxLocal(11, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockDefiBridgeTxLocal(12, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1, 3, 4, 6, 7, 8, 10]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(4);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallData,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('will not split bridge batch over rollups', async () => {
      const bridgeCallData = bridgeCallDatas[2].toBigInt();
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);

      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockDefiBridgeTxLocal(4, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
        mockTx(5, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(7, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTxLocal(8, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // for this to go in, the batch would have to be split
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
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[4].toBigInt()),
          bridgeCallDatas[4].toBigInt(),
        ),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
        ),
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
        ),
        mockDefiBridgeTx(
          3,
          DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallDatas[0].toBigInt()),
          bridgeCallDatas[0].toBigInt(),
        ),
        mockDefiBridgeTx(
          4,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[4].toBigInt()),
          bridgeCallDatas[4].toBigInt(),
        ),
        mockDefiBridgeTx(
          5,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
        ),
        mockDefiBridgeTx(
          6,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[4].toBigInt()),
          bridgeCallDatas[4].toBigInt(),
        ),
        mockDefiBridgeTx(
          7,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[4].toBigInt()),
          bridgeCallDatas[4].toBigInt(),
        ),
      ];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([3, 0, 4, 1, 2, 5, 6, 7]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(4);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallDatas[0].toBigInt(),
        bridgeCallDatas[4].toBigInt(),
        bridgeCallDatas[2].toBigInt(),
        ...Array(numberOfBridgeCalls - 3).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('all assets and bridges are added to aggregator', async () => {
      const pendingTxs = [
        mockDefiBridgeTx(
          0,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[4].toBigInt()),
          bridgeCallDatas[4].toBigInt(),
          1,
        ),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
        ),
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
        ),
        mockDefiBridgeTx(
          3,
          DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallDatas[0].toBigInt()),
          bridgeCallDatas[0].toBigInt(),
        ),
        mockDefiBridgeTx(
          4,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[4].toBigInt()),
          bridgeCallDatas[4].toBigInt(),
          1,
        ),
        mockDefiBridgeTx(
          5,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
        ),
        mockDefiBridgeTx(
          6,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[4].toBigInt()),
          bridgeCallDatas[4].toBigInt(),
          1,
        ),
        mockDefiBridgeTx(
          7,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[4].toBigInt()),
          bridgeCallDatas[4].toBigInt(),
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
        bridgeCallDatas[0].toBigInt(),
        bridgeCallDatas[4].toBigInt(),
        bridgeCallDatas[2].toBigInt(),
        ...Array(numberOfBridgeCalls - 3).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('non-fee paying assets are not added to aggregator 1', async () => {
      const pendingTxs = [
        mockDefiBridgeTx(
          0,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[4].toBigInt()),
          bridgeCallDatas[4].toBigInt(),
          1,
        ),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
        ),
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
          NON_FEE_PAYING_ASSET,
        ),
        mockDefiBridgeTx(
          3,
          DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallDatas[0].toBigInt()),
          bridgeCallDatas[0].toBigInt(),
        ),
        mockDefiBridgeTx(
          4,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[4].toBigInt()),
          bridgeCallDatas[4].toBigInt(),
          1,
        ),
        mockDefiBridgeTx(
          5,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
          NON_FEE_PAYING_ASSET + 1,
        ),
        mockDefiBridgeTx(
          6,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[4].toBigInt()),
          bridgeCallDatas[4].toBigInt(),
          1,
        ),
        mockDefiBridgeTx(
          7,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[4].toBigInt()),
          bridgeCallDatas[4].toBigInt(),
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
        bridgeCallDatas[0].toBigInt(),
        bridgeCallDatas[4].toBigInt(),
        bridgeCallDatas[2].toBigInt(),
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
      fullCost += DEFI_TX_PLUS_BASE_GAS + bridgeConfigs[1].gas!; // our slot
      const pendingTxs = [mockDefiBridgeTx(0, fullCost, bridgeCallDatas[1].toBigInt())];
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallDatas[1].toBigInt(),
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('single defi tx can publish if it covers rollup + bridge costs 2', async () => {
      let almostFullCost = (numInnerRollupTxs * numOuterRollupProofs - 3) * BASE_GAS; // pays for all but 3 slots
      almostFullCost += DEFI_TX_PLUS_BASE_GAS + bridgeConfigs[1].gas!; // pays for defi deposit slot + whole bridge
      const pendingTxs = [
        mockDefiBridgeTx(0, almostFullCost, bridgeCallDatas[1].toBigInt()),
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
        bridgeCallDatas[1].toBigInt(),
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('single defi tx can publish if it covers rollup + bridge costs 3', async () => {
      let almostFullCost = (numInnerRollupTxs * numOuterRollupProofs - 2) * BASE_GAS; // pays for all but 2 slots
      almostFullCost += DEFI_TX_PLUS_BASE_GAS + bridgeConfigs[1].gas!; // pays for defi deposit slot + whole bridge

      // we have removed the base cost of 2 txs above from the excess which we have compensated for
      // as per the calculation that happens inside mockDefiBridgeTx() but then we add the defi tx
      // and a transfer tx back in to cover these missing costs.
      const pendingTxs = [
        mockDefiBridgeTx(0, almostFullCost, bridgeCallDatas[1].toBigInt()),
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
      almostFullCost += DEFI_TX_PLUS_BASE_GAS + bridgeConfigs[1].gas!; // bridge cost

      // in the mockDefiBridgeTx helper here we will calculate excessGas as:
      // excessGas: fee - (DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)),
      // so rather than change all the tests, we add this amount back in to the almostFullCost
      // above to compensate, with the additon that we are adding the full bridge tx cost
      // rather than the single bridge tx cost (which would be the bridge fee/no of bridge txs)

      // so what we should end up with here as the excess is just the bridge fee, which is
      // exactly what we want.
      {
        const pendingTxs = [mockDefiBridgeTx(0, almostFullCost, bridgeCallDatas[1].toBigInt())];

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
        const pendingTxs = [mockDefiBridgeTx(0, almostFullCost, bridgeCallDatas[1].toBigInt())];

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

    it('single payment tx can publish if it covers complete cost (second-class txs will fill in) 4', async () => {
      // Same as above test, except here the rollupDb has second class txs that fill in empty rollup slots
      //
      // rollupDb should return some second-class txs for this test
      const numSecondClassTxs = numInnerRollupTxs * numOuterRollupProofs;
      rollupDb.getPendingSecondClassTxs.mockResolvedValueOnce(mockSecondClassTxs(numSecondClassTxs));
      rollupDb.getPendingSecondClassTxCount.mockResolvedValueOnce(numSecondClassTxs);

      // we flush rollup with a high excess fee tx
      let fullCost = (numInnerRollupTxs * numOuterRollupProofs - 3) * BASE_GAS; // full base cost of rollup
      fullCost += NON_DEFI_TX_GAS; // payment tx cost

      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, excessGas: fullCost, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];

      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);

      // txs are first-class followed by second-class
      // second-class txs only fill empty slots (some will not be published)
      const numSlotsForSecondClass = numInnerRollupTxs * numOuterRollupProofs - pendingTxs.length;
      const allTxIds = [0, 1].concat([...Array(numSlotsForSecondClass)].map((_, i) => i + SECOND_CLASS_ID_OFFSET));
      expectProcessedTxIds(allTxIds);

      expect(rollupCreator.create).toHaveBeenCalledTimes(numOuterRollupProofs);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('defi txs are not published if bridge is not profitable, even if rollup is', async () => {
      const fullCost = (numInnerRollupTxs * numOuterRollupProofs - 1) * BASE_GAS; // excess gas is all other slots
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, excessGas: fullCost, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[0].toBigInt()),
          bridgeCallDatas[0].toBigInt(),
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
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
        ),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
        ),
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[3].toBigInt()),
          bridgeCallDatas[3].toBigInt(),
        ),
        mockDefiBridgeTx(
          3,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[3].toBigInt()),
          bridgeCallDatas[3].toBigInt(),
        ),
        mockDefiBridgeTx(
          4,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[3].toBigInt()),
          bridgeCallDatas[3].toBigInt(),
        ),
        mockDefiBridgeTx(
          5,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[3].toBigInt()),
          bridgeCallDatas[3].toBigInt(),
        ),
        mockDefiBridgeTx(
          6,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[3].toBigInt()),
          bridgeCallDatas[3].toBigInt(),
        ),
        mockDefiBridgeTx(
          7,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
        ),
        mockDefiBridgeTx(
          8,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[3].toBigInt()),
          bridgeCallDatas[3].toBigInt(),
        ),
        mockTx(9, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(10, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(11, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(12, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(13, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];

      //   {
      //   bridgeCallData: 4n,
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
    };

    beforeEach(() => {
      coordinator = newRollupCoordinator(numInnerRollupTxs, numOuterRollupProofs);

      oldTime = currentTime;
      currentTime = new Date('2021-06-20T11:45:00+01:00');

      oldTimeouts = rollupTimeouts;
      rollupTimeouts = {
        baseTimeout: { timeout: new Date('2021-06-20T10:00:00+00:00'), rollupNumber: 1 },
      };

      const getTimeouts = () => rollupTimeouts;

      publishTimeManager = {
        calculateLastTimeouts: jest.fn(() => getTimeouts()),
        calculateNextTimeouts: jest.fn(),
      } as Mockify<PublishTimeManager>;
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

      // run again, with the new timeouts
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([...Array(numInnerRollupTxs)].map((_, i) => i));

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual(Array(numberOfBridgeCalls).fill(0n));
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should publish a rollup after the rollup timeout 3', async () => {
      // from above - let currentTime = new Date('2021-06-20T11:45:00+01:00');
      // mockTx default creation time to new Date(new Date('2021-06-20T11:43:00+01:00').getTime() + id)

      const pendingTxs = [...Array(numInnerRollupTxs)].map((_, i) =>
        mockTx(i, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      );
      let rp = await coordinator.processPendingTxs([]);
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

      // run again, with the pending txs and we will publish
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([...Array(numInnerRollupTxs)].map((_, i) => i));

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual(Array(numberOfBridgeCalls).fill(0n));
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });
    it('should publish a rollup after the rollup timeout (second-class txs will fill in) 4', async () => {
      // from above - let currentTime = new Date('2021-06-20T11:45:00+01:00');
      // mockTx default creation time to new Date(new Date('2021-06-20T11:43:00+01:00').getTime() + id)

      // rollupDb should return some second-class txs for this test
      const numSecondClassTxs = numInnerRollupTxs * numOuterRollupProofs;
      rollupDb.getPendingSecondClassTxs.mockResolvedValueOnce(mockSecondClassTxs(numSecondClassTxs));
      rollupDb.getPendingSecondClassTxCount.mockResolvedValueOnce(numSecondClassTxs);

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

      // txs are first-class followed by second-class
      // second-class txs only fill empty slots (some will not be published)
      const numSlotsForSecondClass = numInnerRollupTxs * numOuterRollupProofs - pendingTxs.length;
      const allTxIds = [0].concat([...Array(numSlotsForSecondClass)].map((_, i) => i + SECOND_CLASS_ID_OFFSET));
      expectProcessedTxIds(allTxIds);

      expect(rollupCreator.create).toHaveBeenCalledTimes(numOuterRollupProofs);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual(Array(numberOfBridgeCalls).fill(0n));
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should publish a rollup after the rollup timeout if any tx is timedout', async () => {
      // from above - let currentTime = new Date('2021-06-20T11:45:00+01:00');
      // mockTx default creation time to new Date(new Date('2021-06-20T11:43:00+01:00').getTime() + id)

      const pendingTxs = [...Array(numInnerRollupTxs)].map((_, i) => {
        if (i == numInnerRollupTxs - 1) {
          // set 1 tx to before '2021-06-20T11:00:00+01:00'
          return mockTx(i, {
            txType: TxType.TRANSFER,
            txFeeAssetId: 0,
            creationTime: new Date('2021-06-20T10:59:00+01:00'),
          });
        }
        return mockTx(i, { txType: TxType.TRANSFER, txFeeAssetId: 0 });
      });
      let rp = await coordinator.processPendingTxs([]);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // set the rollup timeout to the following
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T11:00:00+01:00'), rollupNumber: 1 },
      };
      // and set current time after the timeout
      currentTime = new Date('2021-06-20T12:00:01+01:00');

      // run again, with the pending txs and we will publish
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
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
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

      // run again and we should have published it, but only the non-defi
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual(Array(numberOfBridgeCalls).fill(0n));
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('defi txs are not compared against rollup timeout if bridge cost is not met', async () => {
      // from above - let currentTime = new Date('2021-06-20T11:45:00+01:00');

      // in this test we will
      // 1. set the rollup timeout to be 12:00:00
      // 2. add a bridge tx to the pool at time 06:30:00 that covers a single bridge cost
      // 3. set the current time to be 12:35:00
      // 4. check that a rollup is not produced as the tx does not cover the bridge cost
      const rollupTimeout = new Date('2021-06-20T12:00:00+01:00');

      // the regular tx
      const pendingTxs = [
        mockDefiBridgeTx(
          0,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
          0,
          new Date('2021-06-20T06:30:00+01:00'),
        ),
      ];

      // set the rollup timeout to the following
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: rollupTimeout, rollupNumber: 1 },
      };
      // and set current time after the rollup timeout
      currentTime = new Date('2021-06-20T12:35:00+01:00');

      // shouldn't publish now
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
    });

    it('defi txs are not compared against rollup timeout if bridge cost is met', async () => {
      // from above - let currentTime = new Date('2021-06-20T11:45:00+01:00');

      // in this test we will
      // 1. set the rollup timeout to be 12:00:00
      // 2. add a bridge tx to the pool at time 06:30:00 that covers a full single bridge cost
      // 3. set the current time to be 12:35:00
      // 4. check that a rollup is not produced as the tx does not cover the full rollup cost
      const rollupTimeout = new Date('2021-06-20T12:00:00+01:00');

      // the regular tx
      const pendingTxs = [
        mockDefiBridgeTx(
          0,
          DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
          0,
          new Date('2021-06-20T06:30:00+01:00'),
        ),
      ];

      // set the rollup timeout to the following
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: rollupTimeout, rollupNumber: 1 },
      };
      // and set current time after the rollup timeout
      currentTime = new Date('2021-06-20T12:35:00+01:00');

      // run again and we should have published the rollup as the defi tx is now older than the bridge timeout
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('defi txs are not compared against rollup timeout if bridge cost is met through subsidy', async () => {
      // from above - let currentTime = new Date('2021-06-20T11:45:00+01:00');

      // in this test we will
      // 1. set the rollup timeout to be 12:00:00
      // 2. add a bridge tx to the pool at time 06:30:00 that covers a full single bridge cost
      // 3. set the current time to be 12:35:00
      // 4. check that a rollup is not produced as the tx does not cover the bridge cost
      // 5. set the subsidy to cover the bridge
      // 6. check that a rollup is still not produced as the rollup cost is not met
      const rollupTimeout = new Date('2021-06-20T12:00:00+01:00');

      // the regular tx
      const pendingTxs = [
        mockDefiBridgeTx(
          0,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
          0,
          new Date('2021-06-20T06:30:00+01:00'),
        ),
      ];

      // set the rollup timeout to the following
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: rollupTimeout, rollupNumber: 1 },
      };
      // and set current time after the rollup timeout
      currentTime = new Date('2021-06-20T12:35:00+01:00');

      // shouldn't publish now
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);

      bridgeResolver.getBridgeSubsidy.mockImplementationOnce(() =>
        Promise.resolve(
          generateBridgeSubsidy(getBridgeCost(bridgeCallDatas[2].toBigInt()), bridgeCallDatas[2].toBigInt(), 1n),
        ),
      );

      // run again and we should still not have published
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should publish subsidised bridge with timed out regular txs', async () => {
      // from above - let currentTime = new Date('2021-06-20T11:45:00+01:00');

      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0, creationTime: new Date('2021-06-20T10:43:00+01:00') }),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[1].toBigInt()),
          bridgeCallDatas[1].toBigInt(),
          0,
          new Date('2021-06-20T10:43:00+01:00'),
        ),
      ];

      // set the rollup timeout to 09:00 to ensure we are not timed out

      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T09:00:00+01:00'), rollupNumber: 1 },
      };

      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // set timeout to 11:00:00
      // current ime is 11:45:00
      // both tx times are 10:43:00
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T11:00:00+01:00'), rollupNumber: 1 },
      };

      // subsidise the bridge so that it is in the rollup and we should publish it
      bridgeResolver.getBridgeSubsidy.mockImplementationOnce(() =>
        Promise.resolve(
          generateBridgeSubsidy(getBridgeCost(bridgeCallDatas[1].toBigInt()), bridgeCallDatas[1].toBigInt(), 1n),
        ),
      );

      // we should have pubished all txs
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallDatas[1].toBigInt(),
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('all bridge txs ahould be included in subsidised bridge', async () => {
      // from above - let currentTime = new Date('2021-06-20T11:45:00+01:00');
      // mockTx default creation time to new Date(new Date('2021-06-20T11:43:00+01:00').getTime() + id)

      // bridgeConfigs[1] needs 10 txs to be profitable
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[1].toBigInt()),
          bridgeCallDatas[1].toBigInt(),
        ),
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[1].toBigInt()),
          bridgeCallDatas[1].toBigInt(),
          0,
        ),
      ];

      // set the rollup timeout such that the above txs are timed out
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 },
      };
      // and set current time just after the timeout
      currentTime = new Date('2021-06-20T12:11:01+01:00');

      // set the bridge as subsidised
      bridgeResolver.getBridgeSubsidy.mockImplementationOnce(() =>
        Promise.resolve(
          generateBridgeSubsidy(getBridgeCost(bridgeCallDatas[1].toBigInt()), bridgeCallDatas[1].toBigInt(), 1n),
        ),
      );

      // run again and we should have published it
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1, 2]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallDatas[1].toBigInt(),
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should not publish subsidised bridges solely on rollup timeout', async () => {
      // from above - let currentTime = new Date('2021-06-20T11:45:00+01:00');
      // mockTx default creation time to new Date(new Date('2021-06-20T11:43:00+01:00').getTime() + id)

      // the defi tx pays a single bridge cost
      const pendingTxs = [
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
          0,
          new Date('2021-06-20T11:43:00+01:00'),
        ),
      ];

      // set the bridge to be subsidised for both calls
      bridgeResolver.getBridgeSubsidy.mockImplementationOnce(() =>
        Promise.resolve(
          generateBridgeSubsidy(getBridgeCost(bridgeCallDatas[2].toBigInt()), bridgeCallDatas[2].toBigInt(), 1n),
        ),
      );
      bridgeResolver.getBridgeSubsidy.mockImplementationOnce(() =>
        Promise.resolve(
          generateBridgeSubsidy(getBridgeCost(bridgeCallDatas[2].toBigInt()), bridgeCallDatas[2].toBigInt(), 1n),
        ),
      );

      // the rollup timeout is earlier than the bridge tx time
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T11:00:00+01:00'), rollupNumber: 1 },
      };
      // and set current time just after the rollup timeout
      currentTime = new Date('2021-06-20T12:30:01+01:00');

      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // the rollup timeout is later than the bridge tx time
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 },
      };

      // run again and we should still not have published it
      rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);
    });

    it('should subsidise multiple bridges', async () => {
      // setup the bridge subsidies
      bridgeResolver.getBridgeSubsidy.mockImplementationOnce(() => {
        return Promise.resolve(
          generateBridgeSubsidy(
            (bridgeConfigs[2].numTxs - 1) * getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
            bridgeCallDatas[2].toBigInt(),
            1n,
          ),
        );
      });
      bridgeResolver.getBridgeSubsidy.mockImplementationOnce(() => {
        return Promise.resolve(
          generateBridgeSubsidy(
            (bridgeConfigs[0].numTxs - 1) * getSingleBridgeCost(bridgeCallDatas[0].toBigInt()),
            bridgeCallDatas[0].toBigInt(),
            1n,
          ),
        );
      });
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
        ),
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[0].toBigInt()),
          bridgeCallDatas[0].toBigInt(),
        ),
      ];

      // set the rollup timeout and bridge timeouts to the following
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 },
      };
      // and set current time just after the timeout
      currentTime = new Date('2021-06-20T12:00:01+01:00');

      // run again and we should have published it
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1, 2]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallDatas[2].toBigInt(),
        bridgeCallDatas[0].toBigInt(),
        ...Array(numberOfBridgeCalls - 2).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should not include bridge that competes for subsidy with another bridge', async () => {
      // setup the bridge subsidies
      bridgeResolver.getBridgeSubsidy.mockImplementationOnce(() => {
        return Promise.resolve(
          generateBridgeSubsidy(
            (bridgeConfigs[2].numTxs - 1) * getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
            bridgeCallDatas[2].toBigInt(),
            1n,
          ),
        );
      });
      // the second subsidy uses the same bridge address id and criteria meaning it competes for subsidy
      const alternativeCallData = new BridgeCallData(
        bridgeConfigs[2].bridgeAddressId,
        bridgeConfigs[2].permittedAssets[1],
        bridgeConfigs[2].permittedAssets[0],
        undefined,
        undefined,
        0n,
      );
      bridgeResolver.getBridgeSubsidy.mockImplementationOnce(() => {
        return Promise.resolve(
          generateBridgeSubsidy(
            (bridgeConfigs[2].numTxs - 1) * getSingleBridgeCost(alternativeCallData.toBigInt()),
            alternativeCallData.toBigInt(),
            1n,
          ),
        );
      });
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
        ),
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(alternativeCallData.toBigInt()),
          alternativeCallData.toBigInt(),
        ),
      ];

      // set the rollup timeout and bridge timeouts to the following
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 },
      };
      // and set current time just after the timeout
      currentTime = new Date('2021-06-20T12:00:01+01:00');

      // we should only include the first bridge, the second would not be subsidised
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallDatas[2].toBigInt(),
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should include bridges for the same bridge address id but with different criteria', async () => {
      // setup the bridge subsidies
      bridgeResolver.getBridgeSubsidy.mockImplementationOnce(() => {
        return Promise.resolve(
          generateBridgeSubsidy(
            (bridgeConfigs[2].numTxs - 1) * getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
            bridgeCallDatas[2].toBigInt(),
            1n,
          ),
        );
      });
      // the second subsidy uses the same bridge address id and criteria meaning it competes for subsidy
      const alternativeCallData = new BridgeCallData(
        bridgeConfigs[2].bridgeAddressId,
        bridgeConfigs[2].permittedAssets[1],
        bridgeConfigs[2].permittedAssets[0],
        undefined,
        undefined,
        0n,
      );
      bridgeResolver.getBridgeSubsidy.mockImplementationOnce(() => {
        return Promise.resolve(
          generateBridgeSubsidy(
            (bridgeConfigs[2].numTxs - 1) * getSingleBridgeCost(alternativeCallData.toBigInt()),
            alternativeCallData.toBigInt(),
            2n,
          ),
        );
      });
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
        ),
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(alternativeCallData.toBigInt()),
          alternativeCallData.toBigInt(),
        ),
      ];

      // set the rollup timeout and bridge timeouts to the following
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 },
      };
      // and set current time just after the timeout
      currentTime = new Date('2021-06-20T12:00:01+01:00');

      // we should only include the first bridge, the second would not be subsidised
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 1, 2]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallDatas[2].toBigInt(),
        alternativeCallData.toBigInt(),
        ...Array(numberOfBridgeCalls - 2).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should not include bridge txs where there are no subsidies', async () => {
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0, creationTime: new Date('2021-06-20T11:43:00+01:00') }),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
          0,
          new Date('2021-06-20T11:43:00+01:00'),
        ),
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[1].toBigInt()),
          bridgeCallDatas[1].toBigInt(),
          0,
          new Date('2021-06-20T11:43:00+01:00'),
        ),
      ];
      let rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(false);
      expectProcessedTxIds([]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(0);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(0);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(0);

      // set the rollup timeout
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
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([...Array(numberOfBridgeCalls).fill(0n)]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should not include bridge txs where the bridge is not subsidised', async () => {
      const gasPerTx = getSingleBridgeCost(bridgeCallDatas[1].toBigInt());
      const bridge1Subsidy = (bridgeConfigs[1].numTxs - 1) * gasPerTx;
      // first call is for bridge [2], 0 subsidy
      bridgeResolver.getBridgeSubsidy.mockImplementationOnce(() => {
        return Promise.resolve(generateBridgeSubsidy(0, bridgeCallDatas[2].toBigInt(), 1n));
      });
      // second call
      bridgeResolver.getBridgeSubsidy.mockImplementationOnce(() => {
        return Promise.resolve(generateBridgeSubsidy(bridge1Subsidy, bridgeCallDatas[1].toBigInt(), 1n));
      });
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0, creationTime: new Date('2021-06-20T11:43:00+01:00') }),
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
          0,
          new Date('2021-06-20T11:43:00+01:00'),
        ),
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[1].toBigInt()),
          bridgeCallDatas[1].toBigInt(),
          0,
          new Date('2021-06-20T11:43:00+01:00'),
        ),
      ];

      // set the rollup timeout
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 },
      };
      // and set current time just after the timeout
      currentTime = new Date('2021-06-20T12:00:01+01:00');

      // run again and we should have published it
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expectProcessedTxIds([0, 2]);

      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][5]).toEqual([0]);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallDatas[1].toBigInt(),
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });
  });

  describe('aggregating linked txs', () => {
    const numInnerRollupTxs = 8;
    const numOuterRollupProofs = 2;

    beforeEach(() => {
      coordinator = newRollupCoordinator(numInnerRollupTxs, numOuterRollupProofs);
    });

    it('should break a chain if they cannot be in the same inner rollup', async () => {
      // Create 4 defi deposit txs with different bridge call datas.
      const defiTxs = bridgeConfigs
        .slice(0, 4)
        .map((bc, i) => mockDefiBridgeTx(i, bc.gas! + DEFI_TX_PLUS_BASE_GAS, bridgeCallDatas[i].toBigInt()));

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
          DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallDatas[2].toBigInt()),
          bridgeCallDatas[2].toBigInt(),
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
        bridgeCallDatas[2].toBigInt(),
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });
  });

  describe('interrupt', () => {
    it('should interrupt all helpers', async () => {
      await coordinator.interrupt(false);
      expect(rollupCreator.interrupt).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.interrupt).toHaveBeenCalledTimes(1);
    });

    it('should not aggregate and publish if rollupCreator interrupted', async () => {
      rollupCreator.create.mockImplementation(() => {
        throw new Error('Creator Error');
      });
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => mockTx(i));
      await expect(coordinator.processPendingTxs(pendingTxs)).rejects.toEqual(new Error('Creator Error'));
    });

    it('should throw if interrupting published pipeline with flag set', async () => {
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => mockTx(i));
      const profile = await coordinator.processPendingTxs(pendingTxs);
      expect(profile.published).toBe(true);
      await expect(coordinator.interrupt(true)).rejects.toEqual(new Error('Rollup already publishing'));
    });

    it('should not throw if interrupting published pipeline with flag not set', async () => {
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => mockTx(i));
      const profile = await coordinator.processPendingTxs(pendingTxs);
      expect(profile.published).toBe(true);
      await expect(coordinator.interrupt(false)).resolves.not.toThrow();
    });

    it('should throw if interrupting interrupted pipeline with flag set', async () => {
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => mockTx(i));
      await coordinator.interrupt(true);
      await expect(coordinator.processPendingTxs(pendingTxs)).rejects.toEqual(new InterruptError('Interrupted.'));
      await expect(coordinator.interrupt(true)).rejects.toEqual(new Error('Rollup already interrupted'));
    });

    it('should not throw if interrupting interrupted pipeline with flag not set', async () => {
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => mockTx(i));
      await coordinator.interrupt(true);
      await expect(coordinator.processPendingTxs(pendingTxs)).rejects.toEqual(new InterruptError('Interrupted.'));
      await expect(coordinator.interrupt(false)).resolves.not.toThrow();
    });

    it('should not publish if rollupAggregator is interrupted', async () => {
      rollupAggregator.aggregateRollupProofs.mockImplementation(() => {
        throw new Error('Aggregator Error');
      });

      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => mockTx(i));
      await expect(coordinator.processPendingTxs(pendingTxs)).rejects.toEqual(new Error('Aggregator Error'));
    });

    it('should not publish if rollupPublisher is interrupted', async () => {
      rollupPublisher.publishRollup.mockImplementation(() => {
        throw new Error('Publisher Error');
      });
      const pendingTxs = [...Array(numInnerRollupTxs * numOuterRollupProofs)].map((_, i) => mockTx(i));
      await expect(coordinator.processPendingTxs(pendingTxs)).rejects.toEqual(new Error('Publisher Error'));
    });
  });

  describe('rollup limits no defi', () => {
    const maxGasForRollup = 400000;
    const callDataForRollup = 100000;
    const numInnerRollupTxs = 4;
    const numOuterRollupProofs = 2;
    beforeEach(() => {
      resetGasAndDataValues();
      coordinator = newRollupCoordinator(numInnerRollupTxs, numOuterRollupProofs, maxGasForRollup, callDataForRollup);
    });

    it.each([
      [TxType.DEPOSIT, TxType.TRANSFER],
      [TxType.TRANSFER, TxType.DEPOSIT],
      [TxType.WITHDRAW_HIGH_GAS, TxType.TRANSFER],
      [TxType.WITHDRAW_TO_WALLET, TxType.TRANSFER],
      [TxType.ACCOUNT, TxType.TRANSFER],
    ])(`should not publish txs of type %d would breach the available gas`, async (txTypeUnderTest, secondaryTxType) => {
      // set the gas value for the tx type under test so we can only fit 3 in a rollup
      gasValues[txTypeUnderTest] = 80000;
      gasValues[secondaryTxType] = 40000;
      // ensure that we have enough call data for everything
      callDataValues[txTypeUnderTest] = 10;
      callDataValues[secondaryTxType] = 10;
      const pendingTxs = [
        mockTx(0, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
        mockTx(1, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
        mockTx(2, { txType: secondaryTxType, txFeeAssetId: 0 }),
        mockTx(3, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
        mockTx(4, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
      ];

      // we can fit the first 3 tested txs + the secondary in the rollup
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(rp.totalGas).toBe(360000); // 4 * BASE_GAS + 3 * TxType under test + 1 * secondary
      expect(rp.totalCallData).toBe(40); // 4 * 10
      expectProcessedTxIds([0, 1, 2, 3]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    // TODO add other types when they are supported as second-class txs
    it.each([[TxType.ACCOUNT, TxType.TRANSFER]])(
      `should not publish second-class txs of type %d would breach the available gas`,
      async (txTypeUnderTest, secondaryTxType) => {
        // if first-class txs use up all gas, don't include any second class

        // rollupDb should return some second-class txs for this test
        const numSecondClassTxs = numInnerRollupTxs * numOuterRollupProofs;
        rollupDb.getPendingSecondClassTxs.mockResolvedValueOnce(mockSecondClassTxs(numSecondClassTxs));
        rollupDb.getPendingSecondClassTxCount.mockResolvedValueOnce(numSecondClassTxs);

        // set the gas value for the tx type under test so we can only fit 3 in a rollup
        gasValues[txTypeUnderTest] = 80000;
        gasValues[secondaryTxType] = 40000; //secondary tx type

        // ensure that we have enough call data for everything
        callDataValues[txTypeUnderTest] = 10;
        callDataValues[secondaryTxType] = 10;
        // Last TX here forces publish
        const pendingTxs = [
          mockTx(0, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
          mockTx(1, { txType: secondaryTxType, txFeeAssetId: 0 }),
          mockTx(2, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
          mockTx(3, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
          mockTx(4, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
        ];

        // we can fit the first 3 tested txs + the secondary in the rollup
        const rp = await coordinator.processPendingTxs(pendingTxs);
        expect(rp.published).toBe(true);
        expect(rp.totalGas).toBe(360000); // 4 * BASE_GAS + 3 * TxType under test + 1 * secondary
        expect(rp.totalCallData).toBe(40); // 4 * 10
        expectProcessedTxIds([0, 1, 2, 3]);
        expect(rollupCreator.create).toHaveBeenCalledTimes(1);
        expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
        expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      },
    );

    // TODO add other types when they are supported as second-class txs
    it.each([[TxType.ACCOUNT, TxType.TRANSFER]])(
      `should not publish second-class txs of type %d would breach the available gas 2`,
      async (txTypeUnderTest, secondaryTxType) => {
        // fill in with second-class txs until run out of gas

        // rollupDb should return some second-class txs for this test
        const numSecondClassTxs = numInnerRollupTxs * numOuterRollupProofs;
        rollupDb.getPendingSecondClassTxs.mockResolvedValueOnce(mockSecondClassTxs(numSecondClassTxs));
        rollupDb.getPendingSecondClassTxCount.mockResolvedValueOnce(numSecondClassTxs);

        // we flush rollup with a high excess fee tx
        let fullCost = (numInnerRollupTxs * numOuterRollupProofs - 3) * BASE_GAS; // full base cost of rollup
        fullCost += NON_DEFI_TX_GAS; // payment tx cost

        // set the gas value for the tx type under test so we can only fit 3 in a rollup
        // (a second-class tx will fit, but only 1)
        gasValues[txTypeUnderTest] = 80000;
        gasValues[secondaryTxType] = 40000; //secondary tx type

        // ensure that we have enough call data for everything
        callDataValues[txTypeUnderTest] = 10;
        callDataValues[secondaryTxType] = 10;
        // Last TX here forces publish
        const pendingTxs = [
          mockTx(0, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
          mockTx(1, { txType: secondaryTxType, txFeeAssetId: 0 }),
          mockTx(2, { txType: txTypeUnderTest, excessGas: fullCost, txFeeAssetId: 0 }),
        ];

        // we can fit the first 3 tested txs + the secondary in the rollup
        const rp = await coordinator.processPendingTxs(pendingTxs);
        expect(rp.published).toBe(true);
        expect(rp.totalGas).toBe(360000); // 4 * BASE_GAS + 3 * TxType under test + 1 * secondary
        expect(rp.totalCallData).toBe(40); // 4 * 10
        expectProcessedTxIds([0, 1, 2, 100]);
        expect(rollupCreator.create).toHaveBeenCalledTimes(1);
        expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
        expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      },
    );

    it('should not publish defi claim txs that would breach the available gas', async () => {
      // set the gas value for defi claims so we can only fit 3 in a rollup
      gasValues[TxType.DEFI_CLAIM] = 95000;
      gasValues[TxType.TRANSFER] = 30000; //TRANSFER
      // ensure that we have enough call data for everything
      callDataValues[TxType.DEFI_CLAIM] = 10;
      callDataValues[TxType.TRANSFER] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
        mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(3, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
        mockTx(4, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
      ];

      // claims are reordered to be at the front of the queue
      // we should end up with the first 3 claims and the transfer
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);

      expectProcessedTxIds([0, 1, 3, 2]);
      expect(rp.totalGas).toBe(395000); // 8 * BASE_GAS + 3 * DEFI_CLAIM + 1 * TRANSFER
      expect(rp.totalCallData).toBe(40); // 4 * 10
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should not publish defi claims that would breach the available call data', async () => {
      // set the call data value for deposits so we can only fit 3 in a rollup
      callDataValues[TxType.DEFI_CLAIM] = 30000; //DEFI_CLAIM
      callDataValues[TxType.TRANSFER] = 10000; //TRANSFER
      // ensure that we have enough gas for everything
      gasValues[TxType.DEFI_CLAIM] = 10;
      gasValues[TxType.TRANSFER] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
        mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(3, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
        mockTx(4, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
      ];

      // claims are reordered to be at the front of the queue
      // we should end up with the first 3 claims and the transfer
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(rp.totalCallData).toBe(100000); // 3 * DEFI_CLAIM + TRANSFER
      expect(rp.totalGas).toBe(80040); // 4 * BASE_GAS + 4 * 10
      expectProcessedTxIds([0, 1, 3, 2]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it.each([
      [TxType.DEPOSIT, TxType.TRANSFER],
      [TxType.TRANSFER, TxType.DEPOSIT],
      [TxType.WITHDRAW_HIGH_GAS, TxType.TRANSFER],
      [TxType.WITHDRAW_TO_WALLET, TxType.TRANSFER],
      [TxType.ACCOUNT, TxType.TRANSFER],
    ])(
      `should not publish txs of type %d would breach the available call data`,
      async (txTypeUnderTest, secondaryTxType) => {
        // set the call data value for tx under test so we can only fit 3 in a rollup
        callDataValues[txTypeUnderTest] = 30000; //Tx under test
        callDataValues[secondaryTxType] = 10000; //secondary tx type
        // ensure that we have enough gas for everything
        gasValues[txTypeUnderTest] = 10;
        gasValues[secondaryTxType] = 10;
        const pendingTxs = [
          mockTx(0, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
          mockTx(1, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
          mockTx(2, { txType: secondaryTxType, txFeeAssetId: 0 }),
          mockTx(3, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
          mockTx(4, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
        ];

        // we can fit the first 3 tested txs + the secondary in the rollup
        const rp = await coordinator.processPendingTxs(pendingTxs);
        expect(rp.published).toBe(true);
        expect(rp.totalCallData).toBe(100000); // 3 * Tested txs + secondary
        expect(rp.totalGas).toBe(80040); // 4 * BASE_GAS + 4 * 10
        expectProcessedTxIds([0, 1, 2, 3]);
        expect(rollupCreator.create).toHaveBeenCalledTimes(1);
        expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
        expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      },
    );

    // TODO add other types when they are supported as second-class txs
    it.each([[TxType.ACCOUNT, TxType.TRANSFER]])(
      `should not publish second-class txs of type %d would breach the available call data`,
      async (txTypeUnderTest, secondaryTxType) => {
        // if first-class txs use up all call data, don't include any second class

        // rollupDb should return some second-class txs for this test
        const numSecondClassTxs = numInnerRollupTxs * numOuterRollupProofs;
        rollupDb.getPendingSecondClassTxs.mockResolvedValueOnce(mockSecondClassTxs(numSecondClassTxs));
        rollupDb.getPendingSecondClassTxCount.mockResolvedValueOnce(numSecondClassTxs);

        // set the call data value for tx under test so we can only fit 3 in a rollup
        callDataValues[txTypeUnderTest] = 30000; //Tx under test
        callDataValues[secondaryTxType] = 10000; //secondary tx type
        // ensure that we have enough gas for everything
        gasValues[txTypeUnderTest] = 10;
        gasValues[secondaryTxType] = 10;
        const pendingTxs = [
          mockTx(0, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
          mockTx(1, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
          mockTx(2, { txType: secondaryTxType, txFeeAssetId: 0 }),
          mockTx(3, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
          mockTx(4, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
        ];

        // we can fit the first 3 tested txs + the secondary in the rollup
        const rp = await coordinator.processPendingTxs(pendingTxs);
        expect(rp.published).toBe(true);
        expect(rp.totalCallData).toBe(100000); // 3 * Tested txs + secondary
        expect(rp.totalGas).toBe(80040); // 4 * BASE_GAS + 4 * 10
        expectProcessedTxIds([0, 1, 2, 3]);
        expect(rollupCreator.create).toHaveBeenCalledTimes(1);
        expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
        expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      },
    );

    // TODO add other types when they are supported as second-class txs
    it.each([[TxType.ACCOUNT, TxType.TRANSFER]])(
      `should not publish second-class txs of type %d would breach the available call data 2`,
      async (txTypeUnderTest, secondaryTxType) => {
        // fill in with second-class txs until run out of call data
        //
        // rollupDb should return some second-class txs for this test
        const numSecondClassTxs = numInnerRollupTxs * numOuterRollupProofs;
        rollupDb.getPendingSecondClassTxs.mockResolvedValueOnce(mockSecondClassTxs(numSecondClassTxs));
        rollupDb.getPendingSecondClassTxCount.mockResolvedValueOnce(numSecondClassTxs);

        // we flush rollup with a high excess fee tx
        let fullCost = (numInnerRollupTxs * numOuterRollupProofs - 3) * BASE_GAS; // full base cost of rollup
        fullCost += NON_DEFI_TX_GAS; // payment tx cost

        // set the call data value for tx under test so we can only fit 3 in a rollup
        callDataValues[txTypeUnderTest] = 30000; //Tx under test
        callDataValues[secondaryTxType] = 10000; //secondary tx type
        // ensure that we have enough gas for everything
        gasValues[txTypeUnderTest] = 10;
        gasValues[secondaryTxType] = 10;
        const pendingTxs = [
          mockTx(0, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
          mockTx(1, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
          mockTx(2, { txType: secondaryTxType, excessGas: fullCost, txFeeAssetId: 0 }),
        ];

        // we can fit the first 3 tested txs + the secondary in the rollup
        const rp = await coordinator.processPendingTxs(pendingTxs);
        expect(rp.published).toBe(true);
        expect(rp.totalCallData).toBe(100000); // 3 * Tested txs + secondary
        expect(rp.totalGas).toBe(80040); // 4 * BASE_GAS + 4 * 10
        expectProcessedTxIds([0, 1, 2, 100]);
        expect(rollupCreator.create).toHaveBeenCalledTimes(1);
        expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
        expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      },
    );

    it('should not publish txs that would breach the available gas even with flush', async () => {
      // set the gas value for deposits so we can only fit 3 in a rollup
      gasValues[TxType.DEPOSIT] = 80000; //DEPOSIT
      gasValues[TxType.TRANSFER] = 40000; //TRANSFER
      // ensure that we have enough call data for everything
      callDataValues[TxType.DEPOSIT] = 10;
      callDataValues[TxType.TRANSFER] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
        mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(3, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
        mockTx(4, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
      ];

      // we can fit the first 3 deposits + the transfer in the rollup
      const rp = await coordinator.processPendingTxs(pendingTxs, true);
      expect(rp.published).toBe(true);
      expect(rp.totalGas).toBe(360000); // 4 * BASE_GAS + 3 * DEPOSIT + 1 * TRANSFER
      expect(rp.totalCallData).toBe(40); // 4 * 10
      expectProcessedTxIds([0, 1, 2, 3]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should not publish txs that would breach the available gas even with timeout', async () => {
      // set the gas value for deposits so we can only fit 3 in a rollup
      gasValues[TxType.DEPOSIT] = 80000; //DEPOSIT
      gasValues[TxType.TRANSFER] = 40000; //TRANSFER
      // ensure that we have enough call data for everything
      callDataValues[TxType.DEPOSIT] = 10;
      callDataValues[TxType.TRANSFER] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
        mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(3, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
        mockTx(4, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
      ];

      // set the rollup timeout and bridge timeouts to the following (no timeout for bridge [2])
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 },
      };
      // and set current time just after the timeout
      currentTime = new Date('2021-06-20T12:00:01+01:00');

      // we can fit the first 3 deposits + the transfer in the rollup
      const rp = await coordinator.processPendingTxs(pendingTxs, false);
      expect(rp.published).toBe(true);
      expect(rp.totalGas).toBe(360000); // 4 * BASE_GAS + 3 * DEPOSIT + 1 * TRANSFER
      expect(rp.totalCallData).toBe(40); // 4 * 10
      expectProcessedTxIds([0, 1, 2, 3]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should not publish txs that would breach the available call data even with flush', async () => {
      // set the call data value for deposits so we can only fit 3 in a rollup
      callDataValues[TxType.DEPOSIT] = 30000; //DEPOSIT
      callDataValues[TxType.TRANSFER] = 10000; //TRANSFER
      // ensure that we have enough gas for everything
      gasValues[TxType.DEPOSIT] = 10;
      gasValues[TxType.TRANSFER] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
        mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(3, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
        mockTx(4, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
      ];

      // we can fit the first 3 deposits + the transfer in the rollup
      const rp = await coordinator.processPendingTxs(pendingTxs, true);
      expect(rp.published).toBe(true);
      expect(rp.totalCallData).toBe(100000); // 3 * DEPOSIT + TRANSFER
      expect(rp.totalGas).toBe(80040); // 4 * BASE_GAS + 4 * 10
      expectProcessedTxIds([0, 1, 2, 3]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should not publish txs that would breach the available call data even with timeout', async () => {
      // set the call data value for deposits so we can only fit 3 in a rollup
      callDataValues[TxType.DEPOSIT] = 30000; //DEPOSIT
      callDataValues[TxType.TRANSFER] = 10000; //TRANSFER
      // ensure that we have enough gas for everything
      gasValues[TxType.DEPOSIT] = 10;
      gasValues[TxType.TRANSFER] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
        mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(3, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
        mockTx(4, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
      ];

      // set the rollup timeout and bridge timeouts to the following (no timeout for bridge [2])
      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 },
      };
      // and set current time just after the timeout
      currentTime = new Date('2021-06-20T12:00:01+01:00');

      // we can fit the first 3 deposits + the transfer in the rollup
      const rp = await coordinator.processPendingTxs(pendingTxs, false);
      expect(rp.published).toBe(true);
      expect(rp.totalCallData).toBe(100000); // 3 * DEPOSIT + TRANSFER
      expect(rp.totalGas).toBe(80040); // 4 * BASE_GAS + 4 * 10
      expectProcessedTxIds([0, 1, 2, 3]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should ignore txs chained from ignored txs', async () => {
      // set the gas value for deposits so we can only fit 3 in a rollup
      gasValues[TxType.DEPOSIT] = 100000; //DEPOSIT
      gasValues[TxType.TRANSFER] = 10000; //TRANSFER
      gasValues[TxType.WITHDRAW_TO_WALLET] = 110000; //WITHDRAW_TO_WALLET
      // ensure that we have enough call data for everything
      callDataValues[TxType.DEPOSIT] = 10;
      callDataValues[TxType.TRANSFER] = 10;
      callDataValues[TxType.WITHDRAW_TO_WALLET] = 10;
      const commitment1 = randomBytes(32);
      const commitment2 = randomBytes(32);
      const pendingTxs = [
        mockTx(0, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }), // uses 100000
        mockTx(1, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }), // now at 100000
        mockTx(2, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }), // now at 100000
        mockTx(3, { txType: TxType.WITHDRAW_TO_WALLET, txFeeAssetId: 0, noteCommitment1: commitment1 }), // will be ignored
        mockTx(4, {
          txType: TxType.TRANSFER,
          txFeeAssetId: 0,
          backwardLink: commitment1,
          noteCommitment2: commitment2,
        }), // below gas limit but is chained from tx 3
        mockTx(5, { txType: TxType.TRANSFER, txFeeAssetId: 0, backwardLink: commitment2 }), // below gas limit but is chained from tx 4
        mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];

      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(rp.totalGas).toBe(390000); // 3 * DEPOSIT + TRANSFER + 3 * BASE_GAS
      expect(rp.totalCallData).toBe(40); // 4 * 10
      expect(coordinator.getProcessedTxs().length).toBe(4);
      expectProcessedTxIds([0, 1, 2, 6]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it.each([
      [TxType.DEPOSIT, TxType.TRANSFER],
      [TxType.TRANSFER, TxType.DEPOSIT],
      [TxType.WITHDRAW_HIGH_GAS, TxType.TRANSFER],
      [TxType.WITHDRAW_TO_WALLET, TxType.TRANSFER],
      [TxType.ACCOUNT, TxType.TRANSFER],
    ])(
      `should publish a later tx of type %d if it is within the gas limit'`,
      async (txTypeUnderTest, secondaryTxType) => {
        // set the gas value for the tx under test so we can only fit 2 in a rollup
        gasValues[txTypeUnderTest] = 135000;
        gasValues[secondaryTxType] = 25000;
        // ensure that we have enough call data for everything
        callDataValues[txTypeUnderTest] = 10;
        callDataValues[secondaryTxType] = 10;
        const pendingTxs = [
          mockTx(0, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
          mockTx(1, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
          mockTx(2, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
          mockTx(3, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
          mockTx(4, { txType: secondaryTxType, txFeeAssetId: 0 }),
        ];

        // we can fit the first 2 txs undr test + the secondary tx in the rollup
        const rp = await coordinator.processPendingTxs(pendingTxs);
        expect(rp.published).toBe(true);
        expect(rp.totalGas).toBe(395000); // 2 * tx under test + secondary + 5 * BASE_GAS
        expect(rp.totalCallData).toBe(30);
        expectProcessedTxIds([0, 1, 4]);
        expect(rollupCreator.create).toHaveBeenCalledTimes(1);
        expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
        expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      },
    );

    it.each([
      [TxType.DEPOSIT, TxType.TRANSFER],
      [TxType.TRANSFER, TxType.DEPOSIT],
      [TxType.WITHDRAW_HIGH_GAS, TxType.TRANSFER],
      [TxType.WITHDRAW_TO_WALLET, TxType.TRANSFER],
      [TxType.ACCOUNT, TxType.TRANSFER],
    ])(
      `should publish a later tx of type %d if it is within the call data limit'`,
      async (txTypeUnderTest, secondaryTxType) => {
        // set the call data for txs under test so we can only fit 3 in a rollup
        callDataValues[txTypeUnderTest] = 30000;
        callDataValues[secondaryTxType] = 10000;
        // ensure that we have enough gas for everything
        gasValues[txTypeUnderTest] = 10;
        gasValues[secondaryTxType] = 10;
        const pendingTxs = [
          mockTx(0, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
          mockTx(1, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
          mockTx(2, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
          mockTx(3, { txType: txTypeUnderTest, txFeeAssetId: 0 }),
          mockTx(4, { txType: secondaryTxType, txFeeAssetId: 0 }),
        ];

        // we can fit the first 3 txs under test + the secondary in the rollup
        const rp = await coordinator.processPendingTxs(pendingTxs);
        expect(rp.published).toBe(true);
        expect(rp.totalCallData).toBe(100000); // 3 * tx under test + secondary
        expectProcessedTxIds([0, 1, 2, 4]);
        expect(rollupCreator.create).toHaveBeenCalledTimes(1);
        expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
        expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      },
    );

    it('should publish once remaining gas is lower than any tx type', async () => {
      // set the gas value for deposits so we can only fit 3 in a rollup
      gasValues[TxType.DEPOSIT] = 60000; //DEPOSIT
      gasValues[TxType.TRANSFER] = 75000; //TRANSFER
      gasValues[TxType.WITHDRAW_HIGH_GAS] = 110001; //WITHDRAW_HIGH_GAS
      // ensure that we have enough call data for everything
      callDataValues[TxType.DEPOSIT] = 10;
      callDataValues[TxType.TRANSFER] = 10;
      callDataValues[TxType.WITHDRAW_HIGH_GAS] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
        mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];

      // we publish the 3 txs as if we were to get a WITHDRAW_HIGH_GAS we wouldn't be able to fit it in
      // we have 2 * TRANSFER + DEPOSIT + 5 * BASE_GAS = 310000.
      // adding a WITHDRAW_HIGH_GAS would make it
      // 2 * TRANSFER + DEPOSIT + WITHDRAW_HIGH_GAS + 4 * BASE_GAS = 400001
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(rp.totalCallData).toBe(30);
      expect(rp.totalGas).toBe(310000);
      expectProcessedTxIds([0, 1, 2]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });

    it('should publish once remaining call data is lower than any tx type', async () => {
      callDataValues[TxType.DEPOSIT] = 30000; //DEPOSIT
      callDataValues[TxType.TRANSFER] = 10000; //TRANSFER
      callDataValues[TxType.WITHDRAW_HIGH_GAS] = 50001; //WITHDRAW_HIGH_GAS
      // ensure that we have enough gas for everything
      gasValues[TxType.DEPOSIT] = 10;
      gasValues[TxType.TRANSFER] = 10;
      gasValues[TxType.WITHDRAW_HIGH_GAS] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
        mockTx(1, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
        mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      ];

      // we publish the 3 txs as if we were to get a WITHDRAW_HIGH_GAS we wouldn't be able to fit it in
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(rp.totalCallData).toBe(50000);
      expect(rp.totalGas).toBe(100030);
      expectProcessedTxIds([0, 1, 2]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
    });
  });

  describe('rollup limits with defi', () => {
    const maxGasForRollup = 2000000;
    const callDataForRollup = 100000;
    const numInnerRollupTxs = 4;
    const numOuterRollupProofs = 2;
    beforeEach(() => {
      resetGasAndDataValues();
      coordinator = newRollupCoordinator(numInnerRollupTxs, numOuterRollupProofs, maxGasForRollup, callDataForRollup);
    });

    it('defi bridge gas is included against rollup limit', async () => {
      // gas of this bridge is 1000000
      const bridgeCallData = bridgeCallDatas[0].toBigInt();
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);

      gasValues[TxType.DEPOSIT] = 250000; //DEPOSIT
      gasValues[TxType.TRANSFER] = 300000; //TRANSFER
      gasValues[TxType.WITHDRAW_HIGH_GAS] = 250001; //WITHDRAW_HIGH_GAS
      gasValues[TxType.DEFI_DEPOSIT] = 200000; //DEFI_DEPOSIT
      // ensure that we have enough call data for everything
      callDataValues[TxType.DEPOSIT] = 10;
      callDataValues[TxType.TRANSFER] = 10;
      callDataValues[TxType.WITHDRAW_HIGH_GAS] = 10;
      callDataValues[TxType.DEFI_DEPOSIT] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }), // adds 300000
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)), // pays for complete bridge. adds 1000000 + 200000 gas
        mockTx(2, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }), // 250000. at this point we have used 1750000 gas in tx overhead, then + 5 * BASE_GAS
        mockTx(3, { txType: TxType.WITHDRAW_HIGH_GAS, txFeeAssetId: 0 }), // this tx won't fit
      ];

      // we publish the first 3 txs
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(rp.totalCallData).toBe(30);
      expect(rp.totalGas).toBe(1850000);
      expectProcessedTxIds([0, 1, 2]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallData,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
    });

    it('defi bridge gas is taken from contract and included against rollup limit', async () => {
      const bridgeCallData = bridgeCallDatas[0].toBigInt();
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);

      // set the gas limit for this bridge call data to 900000 on the contract
      bridgeContractGasLimits.set(bridgeCallData, 900000);

      gasValues[TxType.DEPOSIT] = 250000; //DEPOSIT
      gasValues[TxType.TRANSFER] = 300000; //TRANSFER
      gasValues[TxType.WITHDRAW_HIGH_GAS] = 250001; //WITHDRAW_HIGH_GAS
      gasValues[TxType.DEFI_DEPOSIT] = 200000; //DEFI_DEPOSIT
      // ensure that we have enough call data for everything
      callDataValues[TxType.DEPOSIT] = 10;
      callDataValues[TxType.TRANSFER] = 10;
      callDataValues[TxType.WITHDRAW_HIGH_GAS] = 10;
      callDataValues[TxType.DEFI_DEPOSIT] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }), // adds 300000
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)), // pays for complete bridge. adds 900000 + 200000 gas
        mockTx(2, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }), // 250000. at this point we have used 1650000 gas in tx overhead, then + 5 * BASE_GAS
        mockTx(3, { txType: TxType.WITHDRAW_HIGH_GAS, txFeeAssetId: 0 }), // this tx will now fit so we have 1900001 + 4 * BASE_GAS
      ];

      // we publish the all 4 txs
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(rp.totalCallData).toBe(40);
      expect(rp.totalGas).toBe(1980001);
      expectProcessedTxIds([0, 1, 2, 3]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallData,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);

      bridgeContractGasLimits.delete(bridgeCallData);
    });

    it('defi bridge gas is taken from contract and included against rollup limit 2', async () => {
      const bridgeCallData = bridgeCallDatas[0].toBigInt();
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);

      // set the gas limit for thie bridge call data to 1500000 on the contract
      bridgeContractGasLimits.set(bridgeCallData, 1300000);

      gasValues[TxType.DEPOSIT] = 250000; //DEPOSIT
      gasValues[TxType.TRANSFER] = 300000; //TRANSFER
      gasValues[TxType.WITHDRAW_HIGH_GAS] = 250001; //WITHDRAW_HIGH_GAS
      gasValues[TxType.DEFI_DEPOSIT] = 200000; //DEFI_DEPOSIT
      // ensure that we have enough call data for everything
      callDataValues[TxType.DEPOSIT] = 10;
      callDataValues[TxType.TRANSFER] = 10;
      callDataValues[TxType.WITHDRAW_HIGH_GAS] = 10;
      callDataValues[TxType.DEFI_DEPOSIT] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }), // adds 300000
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)), // pays for complete bridge. adds 1300000 + 200000 gas. We now have 1800000 + 6 * BASE_GAS
        mockTx(2, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }), // this tx will not fit
        mockTx(3, { txType: TxType.WITHDRAW_HIGH_GAS, txFeeAssetId: 0 }), // this tx will not fit
      ];

      // we publish the all 4 txs
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(rp.totalCallData).toBe(20);
      expect(rp.totalGas).toBe(1920000);
      expectProcessedTxIds([0, 1]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallData,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);

      bridgeContractGasLimits.delete(bridgeCallData);
    });

    it('defi deposit call data is included against rollup limit', async () => {
      const bridgeCallData = bridgeCallDatas[0].toBigInt();
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);

      callDataValues[TxType.DEPOSIT] = 25000; //DEPOSIT
      callDataValues[TxType.TRANSFER] = 30000; //TRANSFER
      callDataValues[TxType.WITHDRAW_HIGH_GAS] = 25001; //WITHDRAW_HIGH_GAS
      callDataValues[TxType.DEFI_DEPOSIT] = 20000; //DEFI_DEPOSIT
      // ensure that we have enough gas for everything
      gasValues[TxType.DEPOSIT] = 10;
      gasValues[TxType.TRANSFER] = 10;
      gasValues[TxType.WITHDRAW_HIGH_GAS] = 10;
      gasValues[TxType.DEFI_DEPOSIT] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }), // adds 30000
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)), // adds 20000 call data, bridge is paid for so it will be included
        mockTx(2, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }), // 25000. at this point we have used 75000 call data
        mockTx(3, { txType: TxType.WITHDRAW_HIGH_GAS, txFeeAssetId: 0 }), // this tx won't fit
      ];

      // we publish the first 3 txs
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(rp.totalCallData).toBe(75000);
      expect(rp.totalGas).toBe(1100030);
      expectProcessedTxIds([0, 1, 2]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallData,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
    });

    it('should publish defi once remaining gas is lower than any tx type', async () => {
      const bridgeCallData = bridgeCallDatas[0].toBigInt();
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);

      gasValues[TxType.DEPOSIT] = 250000; //DEPOSIT
      gasValues[TxType.TRANSFER] = 200000; //TRANSFER
      gasValues[TxType.WITHDRAW_HIGH_GAS] = 420001; //WITHDRAW_HIGH_GAS
      gasValues[TxType.DEFI_DEPOSIT] = 100000; //DEFI_DEPOSIT
      // ensure that we have enough call data for everything
      callDataValues[TxType.DEPOSIT] = 10;
      callDataValues[TxType.TRANSFER] = 10;
      callDataValues[TxType.WITHDRAW_HIGH_GAS] = 10;
      callDataValues[TxType.DEFI_DEPOSIT] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }), // adds 200000
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)), // pays for complete bridge. adds 1000000 + 100000 gas
        mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: 0 }), // adds 200000. this gets us to 1500000 + 5 * BASE_GAS = 1600000
      ];

      // we publish these txs because a withdraw wouldn't fit if it arrived now
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(coordinator.getProcessedTxs().length).toBe(3);
      expect(rp.totalGas).toBe(1600000);
      expect(rp.totalCallData).toBe(30);
      expectProcessedTxIds([0, 1, 2]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallData,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
    });

    it('should publish defi once remaining call data is lower than any tx type', async () => {
      const bridgeCallData = bridgeCallDatas[0].toBigInt();
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);
      // set the call data value for deposits so we can only fit 3 in a rollup
      callDataValues[TxType.DEPOSIT] = 25000; //DEPOSIT
      callDataValues[TxType.TRANSFER] = 30000; //TRANSFER
      callDataValues[TxType.WITHDRAW_HIGH_GAS] = 30001; //WITHDRAW_HIGH_GAS
      callDataValues[TxType.DEFI_DEPOSIT] = 10000; //DEFI_DEPOSIT
      // ensure that we have enough gas for everything
      gasValues[TxType.DEPOSIT] = 10;
      gasValues[TxType.TRANSFER] = 10;
      gasValues[TxType.WITHDRAW_HIGH_GAS] = 10;
      gasValues[TxType.DEFI_DEPOSIT] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }), // adds 30000
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)), // pays for complete bridge. adds 10000
        mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: 0 }), // adds 30000. this gets us to 70000
      ];

      // we publish these txs because a withdraw wouldn't fit if it arrived now
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(rp.totalCallData).toBe(70000);
      expect(rp.totalGas).toBe(1100030);
      expectProcessedTxIds([0, 1, 2]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallData,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
    });

    it('should ignore defi tx if it breaches gas limit', async () => {
      const bridgeCallData = bridgeCallDatas[0].toBigInt();
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);
      // set the gas value for deposits so we can only fit 3 in a rollup
      gasValues[TxType.DEPOSIT] = 200000; //DEPOSIT
      gasValues[TxType.TRANSFER] = 300000; //TRANSFER
      gasValues[TxType.WITHDRAW_HIGH_GAS] = 300001; //WITHDRAW_HIGH_GAS
      gasValues[TxType.DEFI_DEPOSIT] = 100000; //DEFI_DEPOSIT

      // ensure that we have enough call data for everything
      callDataValues[TxType.DEPOSIT] = 10;
      callDataValues[TxType.TRANSFER] = 10;
      callDataValues[TxType.WITHDRAW_HIGH_GAS] = 10;
      callDataValues[TxType.DEFI_DEPOSIT] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }), // adds 300000
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // adds 100000 gas as it is included
        mockDefiBridgeTxLocal(2, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // adds 100000 gas as it is included
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // adds 100000 gas as it is included
        mockDefiBridgeTxLocal(4, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)), // pays for complete bridge. adds 1000000 + 100000 gas
        mockTx(5, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }), // adds 200000. this gets us to 1900000 + 2 * BASE_GASE = 1940000
        mockDefiBridgeTxLocal(6, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)), // pays for complete bridge making us very profitable, but uses too much gas
      ];

      // we publish these txs because a withdraw wouldn't fit if it arrived now
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(rp.totalCallData).toBe(60);
      expect(rp.totalGas).toBe(1940000);
      expectProcessedTxIds([0, 4, 1, 2, 3, 5]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(2);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallData,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
    });

    it('should ignore defi tx if it breaches call data limit', async () => {
      const bridgeCallData = bridgeCallDatas[0].toBigInt();
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);
      // set the call data for deposits so we can only fit 3 in a rollup
      callDataValues[TxType.DEPOSIT] = 25000; //DEPOSIT
      callDataValues[TxType.TRANSFER] = 30000; //TRANSFER
      callDataValues[TxType.WITHDRAW_HIGH_GAS] = 30001; //WITHDRAW_HIGH_GAS
      callDataValues[TxType.DEFI_DEPOSIT] = 10000; //DEFI_DEPOSIT

      // ensure that we have enough gas for everything
      gasValues[TxType.DEPOSIT] = 10;
      gasValues[TxType.TRANSFER] = 10;
      gasValues[TxType.WITHDRAW_HIGH_GAS] = 10;
      gasValues[TxType.DEFI_DEPOSIT] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }), // adds 30000
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // adds 10000 call data as it is included
        mockDefiBridgeTxLocal(2, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // adds 10000 call data as it is included
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // adds 10000 call data as it is included
        mockDefiBridgeTxLocal(4, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)), // pays for complete bridge. adds 10000 call data
        mockTx(5, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }), // adds 25000. this gets us to 95000
        mockDefiBridgeTxLocal(6, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)), // pays for complete bridge again making us very profitable, but uses too much call data
      ];

      // we publish these txs because a withdraw wouldn't fit if it arrived now
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(rp.totalCallData).toBe(95000);
      expect(rp.totalGas).toBe(1040060);
      expectProcessedTxIds([0, 4, 1, 2, 3, 5]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(2);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallData,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
    });

    it('should ignore defi tx for additional bridge if it breaches call data limit', async () => {
      const bridgeCallData = bridgeCallDatas[0].toBigInt();
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);
      // set the call data for deposits so we can only fit 3 in a rollup
      callDataValues[TxType.DEPOSIT] = 25000; //DEPOSIT
      callDataValues[TxType.TRANSFER] = 30000; //TRANSFER
      callDataValues[TxType.WITHDRAW_HIGH_GAS] = 30001; //WITHDRAW_HIGH_GAS
      callDataValues[TxType.DEFI_DEPOSIT] = 10000; //DEFI_DEPOSIT

      // ensure that we have enough gas for everything
      gasValues[TxType.DEPOSIT] = 10;
      gasValues[TxType.TRANSFER] = 10;
      gasValues[TxType.WITHDRAW_HIGH_GAS] = 10;
      gasValues[TxType.DEFI_DEPOSIT] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }), // adds 30000
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // adds 10000 call data as it is included
        mockDefiBridgeTxLocal(2, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // adds 10000 call data as it is included
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // adds 10000 call data as it is included
        mockDefiBridgeTxLocal(4, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)), // pays for complete bridge. adds 10000 call data
        mockTx(5, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }), // adds 25000. this gets us to 95000
        mockDefiBridgeTx(
          6,
          DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallDatas[1].toBigInt()),
          bridgeCallDatas[1].toBigInt(),
        ), // pays for 2nd complete bridge, but uses too much call data
      ];

      // we publish these txs because a withdraw wouldn't fit if it arrived now
      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(rp.totalCallData).toBe(95000);
      expect(rp.totalGas).toBe(1040060);
      expectProcessedTxIds([0, 4, 1, 2, 3, 5]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(2);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallData,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
    });

    it('should ignore defi tx if it breaches gas limit even with flush', async () => {
      const bridgeCallData = bridgeCallDatas[0].toBigInt();
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);
      // set the gas value for deposits so we can only fit 3 in a rollup
      gasValues[TxType.DEPOSIT] = 200000; //DEPOSIT
      gasValues[TxType.TRANSFER] = 300000; //TRANSFER
      gasValues[TxType.WITHDRAW_HIGH_GAS] = 300001; //WITHDRAW_HIGH_GAS
      gasValues[TxType.DEFI_DEPOSIT] = 100000; //DEFI_DEPOSIT

      // ensure that we have enough call data for everything
      callDataValues[TxType.DEPOSIT] = 10;
      callDataValues[TxType.TRANSFER] = 10;
      callDataValues[TxType.WITHDRAW_HIGH_GAS] = 10;
      callDataValues[TxType.DEFI_DEPOSIT] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }), // adds 300000
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // adds 100000 gas as it is included
        mockDefiBridgeTxLocal(2, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // adds 100000 gas as it is included
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // adds 100000 gas as it is included
        mockDefiBridgeTxLocal(4, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)), // pays for complete bridge. adds 1000000 + 100000 gas
        mockTx(5, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }), // adds 200000. this gets us to 1900000 + 2 * BASE_GASE = 1940000
        mockDefiBridgeTxLocal(6, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)), // pays for complete bridge making us very profitable, but uses too much gas
      ];

      // we publish these txs because a withdraw wouldn't fit if it arrived now
      const rp = await coordinator.processPendingTxs(pendingTxs, true);
      expect(rp.published).toBe(true);
      expect(rp.totalCallData).toBe(60);
      expect(rp.totalGas).toBe(1940000);
      expectProcessedTxIds([0, 1, 2, 3, 4, 5]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(2);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallData,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
    });

    it('should ignore defi tx if it breaches gas limit even with timeout', async () => {
      const bridgeCallData = bridgeCallDatas[0].toBigInt();
      bridgeResolver.getBridgeSubsidy.mockImplementationOnce((bridgeCallData: bigint) =>
        Promise.resolve(generateBridgeSubsidy(getBridgeCost(bridgeCallData), bridgeCallData, 1n)),
      );
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);
      // set the gas value for deposits so we can only fit 3 in a rollup
      gasValues[TxType.DEPOSIT] = 200000; //DEPOSIT
      gasValues[TxType.TRANSFER] = 300000; //TRANSFER
      gasValues[TxType.WITHDRAW_HIGH_GAS] = 300001; //WITHDRAW_HIGH_GAS
      gasValues[TxType.DEFI_DEPOSIT] = 100000; //DEFI_DEPOSIT

      // ensure that we have enough call data for everything
      callDataValues[TxType.DEPOSIT] = 10;
      callDataValues[TxType.TRANSFER] = 10;
      callDataValues[TxType.WITHDRAW_HIGH_GAS] = 10;
      callDataValues[TxType.DEFI_DEPOSIT] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }), // adds 300000
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // adds 100000 gas as it is included
        mockDefiBridgeTxLocal(2, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // adds 100000 gas as it is included
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // adds 100000 gas as it is included
        mockDefiBridgeTxLocal(4, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)), // pays for complete bridge. adds 1000000 + 100000 gas
        mockTx(5, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }), // adds 200000. this gets us to 1900000 + 2 * BASE_GASE = 1940000
        mockDefiBridgeTxLocal(6, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)), // pays for complete bridge making us very profitable, but uses too much gas
      ];

      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 },
      };
      // and set current time just after the timeout
      currentTime = new Date('2021-06-20T12:00:01+01:00');

      // we publish these txs because a withdraw wouldn't fit if it arrived now
      const rp = await coordinator.processPendingTxs(pendingTxs, false);
      expect(rp.published).toBe(true);
      expect(rp.totalCallData).toBe(60);
      expect(rp.totalGas).toBe(1940000);
      expectProcessedTxIds([0, 1, 2, 3, 4, 5]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(2);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallData,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
    });

    it('should ignore defi tx if it breaches call data limit even with flush', async () => {
      const bridgeCallData = bridgeCallDatas[0].toBigInt();
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);
      // set the call data for deposits so we can only fit 3 in a rollup
      callDataValues[TxType.DEPOSIT] = 25000; //DEPOSIT
      callDataValues[TxType.TRANSFER] = 30000; //TRANSFER
      callDataValues[TxType.WITHDRAW_HIGH_GAS] = 30001; //WITHDRAW_HIGH_GAS
      callDataValues[TxType.DEFI_DEPOSIT] = 10000; //DEFI_DEPOSIT

      // ensure that we have enough gas for everything
      gasValues[TxType.DEPOSIT] = 10;
      gasValues[TxType.TRANSFER] = 10;
      gasValues[TxType.WITHDRAW_HIGH_GAS] = 10;
      gasValues[TxType.DEFI_DEPOSIT] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }), // adds 30000
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // adds 10000 call data as it is included
        mockDefiBridgeTxLocal(2, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // adds 10000 call data as it is included
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // adds 10000 call data as it is included
        mockDefiBridgeTxLocal(4, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)), // pays for complete bridge. adds 10000 call data
        mockTx(5, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }), // adds 25000. this gets us to 95000
        mockDefiBridgeTxLocal(6, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)), // pays for complete bridge again making us very profitable, but uses too much call data
      ];

      // we publish these txs because a withdraw wouldn't fit if it arrived now
      const rp = await coordinator.processPendingTxs(pendingTxs, true);
      expect(rp.published).toBe(true);
      expect(rp.totalCallData).toBe(95000);
      expect(rp.totalGas).toBe(1040060);
      expectProcessedTxIds([0, 1, 2, 3, 4, 5]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(2);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallData,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
    });

    it('should ignore defi tx if it breaches call data limit even with subsidy', async () => {
      const bridgeCallData = bridgeCallDatas[0].toBigInt();
      bridgeResolver.getBridgeSubsidy.mockImplementationOnce((bridgeCallData: bigint) =>
        Promise.resolve(generateBridgeSubsidy(getBridgeCost(bridgeCallData), bridgeCallData, 1n)),
      );
      const mockDefiBridgeTxLocal = (id: number, gas: number) => mockDefiBridgeTx(id, gas, bridgeCallData);
      // set the call data for deposits so we can only fit 3 in a rollup
      callDataValues[TxType.DEPOSIT] = 25000; //DEPOSIT
      callDataValues[TxType.TRANSFER] = 30000; //TRANSFER
      callDataValues[TxType.WITHDRAW_HIGH_GAS] = 30001; //WITHDRAW_HIGH_GAS
      callDataValues[TxType.DEFI_DEPOSIT] = 10000; //DEFI_DEPOSIT

      // ensure that we have enough gas for everything
      gasValues[TxType.DEPOSIT] = 10;
      gasValues[TxType.TRANSFER] = 10;
      gasValues[TxType.WITHDRAW_HIGH_GAS] = 10;
      gasValues[TxType.DEFI_DEPOSIT] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }), // adds 30000
        mockDefiBridgeTxLocal(1, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // adds 10000 call data as it is included
        mockDefiBridgeTxLocal(2, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // adds 10000 call data as it is included
        mockDefiBridgeTxLocal(3, DEFI_TX_PLUS_BASE_GAS + getSingleBridgeCost(bridgeCallData)), // adds 10000 call data as it is included
        mockDefiBridgeTxLocal(4, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)), // pays for complete bridge. adds 10000 call data
        mockTx(5, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }), // adds 25000. this gets us to 95000
        mockDefiBridgeTxLocal(6, DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallData)), // pays for complete bridge again making us very profitable, but uses too much call data
      ];

      rollupTimeouts = {
        ...rollupTimeouts,
        baseTimeout: { timeout: new Date('2021-06-20T12:00:00+01:00'), rollupNumber: 1 },
      };
      // and set current time just after the timeout
      currentTime = new Date('2021-06-20T12:00:01+01:00');

      // we publish these txs because a withdraw wouldn't fit if it arrived now
      const rp = await coordinator.processPendingTxs(pendingTxs, false);
      expect(rp.published).toBe(true);
      expect(rp.totalCallData).toBe(95000);
      expect(rp.totalGas).toBe(1040060);
      expectProcessedTxIds([0, 1, 2, 3, 4, 5]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(2);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallData,
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
    });

    it('defi bridges are not published if they breach gas limit', async () => {
      const maxGasForRollup = 4000000;
      coordinator = newRollupCoordinator(numInnerRollupTxs, numOuterRollupProofs, maxGasForRollup, callDataForRollup);

      gasValues[TxType.DEPOSIT] = 250000; //DEPOSIT
      gasValues[TxType.TRANSFER] = 300000; //TRANSFER
      gasValues[TxType.WITHDRAW_HIGH_GAS] = 300001; //WITHDRAW_HIGH_GAS
      gasValues[TxType.DEFI_DEPOSIT] = 100000; //DEFI_DEPOSIT
      // ensure that we have enough call data for everything
      callDataValues[TxType.DEPOSIT] = 10;
      callDataValues[TxType.TRANSFER] = 10;
      callDataValues[TxType.WITHDRAW_HIGH_GAS] = 10;
      callDataValues[TxType.DEFI_DEPOSIT] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }), // adds 300000
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallDatas[3].toBigInt()),
          bridgeCallDatas[3].toBigInt(),
        ), // pays for complete bridge. adds 3000000 + 100000 gas
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallDatas[1].toBigInt()),
          bridgeCallDatas[1].toBigInt(),
        ), // would need to add 1000000 + 100000 so is not included
        mockTx(3, { txType: TxType.TRANSFER, txFeeAssetId: 0 }), // adds 300000. this gets us to 3700000 + 5 * BASE_GAS
      ];

      const rp = await coordinator.processPendingTxs(pendingTxs);
      expect(rp.published).toBe(true);
      expect(rp.totalGas).toBe(3800000);
      expect(rp.totalCallData).toBe(30);
      expectProcessedTxIds([0, 1, 3]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallDatas[3].toBigInt(),
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
    });

    it('defi bridges are not published if they breach gas limit even with flush', async () => {
      const maxGasForRollup = 4000000;
      coordinator = newRollupCoordinator(numInnerRollupTxs, numOuterRollupProofs, maxGasForRollup, callDataForRollup);

      // set the gas value for deposits so we can only fit 3 in a rollup
      gasValues[TxType.DEPOSIT] = 250000; //DEPOSIT
      gasValues[TxType.TRANSFER] = 300000; //TRANSFER
      gasValues[TxType.WITHDRAW_HIGH_GAS] = 300001; //WITHDRAW_HIGH_GAS
      gasValues[TxType.DEFI_DEPOSIT] = 100000; //DEFI_DEPOSIT
      // ensure that we have enough call data for everything
      callDataValues[TxType.DEPOSIT] = 10;
      callDataValues[TxType.TRANSFER] = 10;
      callDataValues[TxType.WITHDRAW_HIGH_GAS] = 10;
      callDataValues[TxType.DEFI_DEPOSIT] = 10;
      const pendingTxs = [
        mockTx(0, { txType: TxType.TRANSFER, txFeeAssetId: 0 }), // adds 300000
        mockDefiBridgeTx(
          1,
          DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallDatas[3].toBigInt()),
          bridgeCallDatas[3].toBigInt(),
        ), // pays for complete bridge. adds 3000000 + 100000 gas
        mockDefiBridgeTx(
          2,
          DEFI_TX_PLUS_BASE_GAS + getBridgeCost(bridgeCallDatas[1].toBigInt()),
          bridgeCallDatas[1].toBigInt(),
        ), // would need to add 1000000 + 100000 so is not included
        mockTx(3, { txType: TxType.TRANSFER, txFeeAssetId: 0 }), // adds 300000. this gets us to 3700000 + 5 * BASE_GAS
      ];

      const rp = await coordinator.processPendingTxs(pendingTxs, true);
      expect(rp.published).toBe(true);
      expect(rp.totalCallData).toBe(30);
      expect(rp.totalGas).toBe(3800000);
      expectProcessedTxIds([0, 1, 3]);
      expect(rollupCreator.create).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs).toHaveBeenCalledTimes(1);
      expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
      expect(rollupAggregator.aggregateRollupProofs.mock.calls[0][4]).toEqual([
        bridgeCallDatas[3].toBigInt(),
        ...Array(numberOfBridgeCalls - 1).fill(0n),
      ]);
    });
  });
});

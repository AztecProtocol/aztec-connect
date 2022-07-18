import { toBigIntBE, toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofData } from '@aztec/barretenberg/client_proofs';
import { BridgeConfig } from '@aztec/barretenberg/rollup_provider';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { randomBytes } from 'crypto';
import { TxDao } from '../entity/tx';
import { TxFeeResolver } from '../tx_fee_resolver';
import { RollupTx } from './bridge_tx_queue';
import { BridgeProfile, profileRollup } from './rollup_profiler';

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

const bridgeConfigs: BridgeConfig[] = [
  {
    bridgeId: 1n,
    numTxs: 5,
    gas: 500000,
    rollupFrequency: 2,
  },
  {
    bridgeId: 2n,
    numTxs: 2,
    gas: 500000,
    rollupFrequency: 3,
  },
  {
    bridgeId: 3n,
    numTxs: 10,
    gas: 500000,
    rollupFrequency: 3,
  },
];

const BASE_GAS = 20000;

const randomInt = (range = 2 ** 32 - 1, offset = 0) => Math.floor(Math.random() * (range + 1)) + offset;

const callDataValues: { [key: number]: number } = {
  0: randomInt(1000),
  1: randomInt(1000),
  2: randomInt(1000),
  3: randomInt(1000),
  4: randomInt(1000),
  5: randomInt(1000),
  6: randomInt(1000),
};

const gasRandomRange = 100;

const adjustedGasValues: Array<{ [key: number]: number }> = [
  {
    0: randomInt(gasRandomRange, 100),
    1: randomInt(gasRandomRange, 100),
    2: randomInt(gasRandomRange, 100),
    3: randomInt(gasRandomRange, 100),
    4: randomInt(gasRandomRange, 100),
    5: randomInt(gasRandomRange, 100),
    6: randomInt(gasRandomRange, 100),
  },
  {
    0: randomInt(gasRandomRange, 100),
    1: randomInt(gasRandomRange, 100),
    2: randomInt(gasRandomRange, 100),
    3: randomInt(gasRandomRange, 100),
    4: randomInt(gasRandomRange, 100),
    5: randomInt(gasRandomRange, 100),
    6: randomInt(gasRandomRange, 100),
  },
];

const unadjustedGasValues: Array<{ [key: number]: number }> = [
  {
    0: randomInt(gasRandomRange, 0),
    1: randomInt(gasRandomRange, 0),
    2: randomInt(gasRandomRange, 0),
    3: randomInt(gasRandomRange, 0),
    4: randomInt(gasRandomRange, 0),
    5: randomInt(gasRandomRange, 0),
    6: randomInt(gasRandomRange, 0),
  },
  {
    0: randomInt(gasRandomRange, 0),
    1: randomInt(gasRandomRange, 0),
    2: randomInt(gasRandomRange, 0),
    3: randomInt(gasRandomRange, 0),
    4: randomInt(gasRandomRange, 0),
    5: randomInt(gasRandomRange, 0),
    6: randomInt(gasRandomRange, 0),
  },
];

describe('Profile Rollup', () => {
  let feeResolver: Mockify<TxFeeResolver>;

  const currentTime = new Date('2021-06-20T11:45:00+01:00');

  const getCurrentTime = () => currentTime;

  const txTypeToProofId = (txType: TxType) => (txType < TxType.WITHDRAW_HIGH_GAS ? txType + 1 : txType);

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
      id,
      txType,
      created: creationTime,
      excessGas,
      proofData: Buffer.concat([
        numToUInt32BE(txTypeToProofId(txType), 32),
        noteCommitment1,
        noteCommitment2,
        randomBytes(7 * 32),
        numToUInt32BE(txFeeAssetId, 32),
        toBufferBE(bridgeId, 32),
        randomBytes(3 * 32),
        backwardLink,
        allowChain,
      ]),
    } as any as TxDao);

  const createRollupTx = (rawTx: TxDao): RollupTx => {
    const proof = new ProofData(rawTx.proofData);
    return {
      tx: rawTx,
      excessGas: rawTx.excessGas,
      fee: {
        assetId: proof.feeAssetId,
        value: toBigIntBE(proof.txFee),
      },
      bridgeId: toBigIntBE(proof.bridgeId),
    };
  };

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
    const cost = gas / numTxs;
    return cost % numTxs ? cost + 1 : cost;
  };

  const getAsset = (tx: TxDao) => {
    const proof = new ProofData(tx.proofData);
    return proof.feeAssetId;
  };

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => getCurrentTime().getTime());

    feeResolver = {
      start: jest.fn(),
      stop: jest.fn(),
      getGasPaidForByFee: jest.fn().mockImplementation((assetId: number, fee: bigint) => fee),
      getTxFeeFromGas: jest.fn().mockImplementation((assetId: number, gas: bigint) => gas),
      getAdjustedTxGas: jest.fn().mockImplementation((assetId: number, txType: TxType) => {
        return adjustedGasValues[assetId][txType];
      }),
      getUnadjustedTxGas: jest.fn().mockImplementation((assetId: number, txType: TxType) => {
        return unadjustedGasValues[assetId][txType];
      }),
      getAdjustedBridgeTxGas: jest.fn(),
      getUnadjustedBridgeTxGas: jest.fn(),
      getFullBridgeGasFromContract: jest.fn().mockImplementation((bridgeId: bigint) => getBridgeCost(bridgeId)),
      getFullBridgeGas: jest.fn().mockImplementation((bridgeId: bigint) => getBridgeCost(bridgeId)),
      getSingleBridgeTxGas: jest.fn().mockImplementation((bridgeId: bigint) => getSingleBridgeCost(bridgeId)),
      getTxFees: jest.fn(),
      getDefiFees: jest.fn(),
      isFeePayingAsset: jest.fn().mockImplementation((assetId: number) => assetId < 3),
      getAdjustedBaseVerificationGas: jest.fn().mockImplementation((txType: TxType) => {
        const adjustment = adjustedGasValues[0][txType] - unadjustedGasValues[0][txType];
        return BASE_GAS + adjustment;
      }),
      getUnadjustedBaseVerificationGas: jest.fn().mockImplementation(() => BASE_GAS),
      getTxCallData: jest.fn().mockImplementation((txType: TxType) => callDataValues[txType]),
      getMaxTxCallData: jest.fn(),
      getMaxUnadjustedGas: jest.fn(),
    };
  });

  afterEach(() => {
    expect(feeResolver.getAdjustedBridgeTxGas).not.toBeCalled();
    expect(feeResolver.getTxFees).not.toBeCalled();
    expect(feeResolver.getDefiFees).not.toBeCalled();
    expect(feeResolver.getMaxTxCallData).not.toBeCalled();
    expect(feeResolver.getMaxUnadjustedGas).not.toBeCalled();
  });

  it('gives profile for zero txs', () => {
    const rollupProfile = profileRollup([], feeResolver as any, 5, 20);
    expect(rollupProfile).toBeTruthy();
    expect(rollupProfile.published).toBe(false);
    expect(rollupProfile.rollupSize).toBe(20);
    expect(rollupProfile.gasBalance).toBe(BASE_GAS * -20);
    expect(rollupProfile.totalCallData).toBe(0);
    expect(rollupProfile.totalGas).toBe(BASE_GAS * 20); // so empty slots consunming gas
    expect(rollupProfile.bridgeProfiles).toBeTruthy();
    expect([...rollupProfile.bridgeProfiles.values()].length).toBe(0);
    expect(rollupProfile.totalTxs).toBe(0);
  });

  it('gives profile for non defi txs', () => {
    const txs = [
      mockTx(0, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
      mockTx(1, { txType: TxType.ACCOUNT, txFeeAssetId: 1 }),
      mockTx(3, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
      mockTx(4, { txType: TxType.WITHDRAW_HIGH_GAS, txFeeAssetId: 1 }),
      mockTx(5, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
      mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      mockTx(7, { txType: TxType.WITHDRAW_TO_WALLET, txFeeAssetId: 1 }),
      mockTx(8, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
      mockTx(10, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 1 }),
    ];

    const numEmptySlots = 11;
    let expectedGasBalance = -(numEmptySlots * BASE_GAS);
    for (const tx of txs) {
      const asset = new ProofData(tx.proofData).feeAssetId;
      expectedGasBalance += adjustedGasValues[asset][tx.txType] - unadjustedGasValues[asset][tx.txType];
    }

    const rollupTxs = txs.map(createRollupTx);
    const rollupProfile = profileRollup(rollupTxs, feeResolver as any, 5, 20);
    expect(rollupProfile).toBeTruthy();
    expect(rollupProfile.published).toBe(false);
    expect(rollupProfile.rollupSize).toBe(20);
    expect(rollupProfile.gasBalance).toBe(expectedGasBalance);
    expect(rollupProfile.bridgeProfiles).toBeTruthy();
    expect([...rollupProfile.bridgeProfiles.values()].length).toBe(0);
    expect(rollupProfile.earliestTx.getTime()).toEqual(txs[0].created.getTime());
    expect(rollupProfile.latestTx.getTime()).toEqual(txs[8].created.getTime());
    expect(rollupProfile.totalTxs).toBe(9);

    const totalGas =
      txs.reduce((prev, current) => prev + unadjustedGasValues[getAsset(current)][current.txType], 0) +
      numEmptySlots * BASE_GAS;
    const totalCallData = txs.reduce((prev, current) => prev + callDataValues[current.txType], 0);
    expect(rollupProfile.totalGas).toBe(totalGas);
    expect(rollupProfile.totalCallData).toBe(totalCallData);
  });

  it('correctly accounts for excess gas provided', () => {
    const txs = [
      mockTx(0, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
      mockTx(1, { txType: TxType.ACCOUNT, txFeeAssetId: 1 }),
      mockTx(3, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
      mockTx(4, { txType: TxType.WITHDRAW_HIGH_GAS, txFeeAssetId: 0 }),
      mockTx(5, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 1 }),
      mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 0, excessGas: 2 * BASE_GAS }),
      mockTx(7, { txType: TxType.WITHDRAW_TO_WALLET, txFeeAssetId: 0 }),
      mockTx(8, { txType: TxType.DEPOSIT, txFeeAssetId: 1, excessGas: 3 * BASE_GAS }),
      mockTx(10, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
    ];

    const numEmptySlots = 11;
    let expectedGasBalance = 5 * BASE_GAS; // 5 slots worth of excess gas from txs above
    expectedGasBalance -= numEmptySlots * BASE_GAS;
    for (const tx of txs) {
      const asset = new ProofData(tx.proofData).feeAssetId;
      expectedGasBalance += adjustedGasValues[asset][tx.txType] - unadjustedGasValues[asset][tx.txType];
    }

    const rollupTxs = txs.map(createRollupTx);
    const rollupProfile = profileRollup(rollupTxs, feeResolver as any, 5, 20);
    expect(rollupProfile).toBeTruthy();
    expect(rollupProfile.published).toBe(false);
    expect(rollupProfile.rollupSize).toBe(20);
    expect(rollupProfile.gasBalance).toBe(expectedGasBalance);
    expect(rollupProfile.bridgeProfiles).toBeTruthy();
    expect([...rollupProfile.bridgeProfiles.values()].length).toBe(0);
    expect(rollupProfile.earliestTx.getTime()).toEqual(txs[0].created.getTime());
    expect(rollupProfile.latestTx.getTime()).toEqual(txs[8].created.getTime());
    expect(rollupProfile.totalTxs).toBe(9);

    const totalGas =
      txs.reduce((prev, current) => prev + unadjustedGasValues[getAsset(current)][current.txType], 0) +
      numEmptySlots * BASE_GAS;
    const totalCallData = txs.reduce((prev, current) => prev + callDataValues[current.txType], 0);
    expect(rollupProfile.totalGas).toBe(totalGas);
    expect(rollupProfile.totalCallData).toBe(totalCallData);
  });

  it('becomes profitable with excess gas', () => {
    const txs = [
      mockTx(0, { txType: TxType.DEPOSIT, txFeeAssetId: 0, excessGas: 7 * BASE_GAS }),
      mockTx(1, { txType: TxType.ACCOUNT, txFeeAssetId: 0 }),
      mockTx(3, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 1 }),
      mockTx(4, { txType: TxType.WITHDRAW_HIGH_GAS, txFeeAssetId: 0 }),
      mockTx(5, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
      mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 1, excessGas: 2 * BASE_GAS }),
      mockTx(7, { txType: TxType.WITHDRAW_TO_WALLET, txFeeAssetId: 0 }),
      mockTx(8, { txType: TxType.DEPOSIT, txFeeAssetId: 0, excessGas: 3 * BASE_GAS }),
      mockTx(10, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 1 }),
    ];

    const rollupTxs = txs.map(createRollupTx);
    const rollupProfile = profileRollup(rollupTxs, feeResolver as any, 5, 20);
    const numEmptySlots = 11;
    let expectedGasBalance = 12 * BASE_GAS; // 12 slots worth of excess gas from txs above
    expectedGasBalance -= numEmptySlots * BASE_GAS;
    for (const tx of txs) {
      const asset = new ProofData(tx.proofData).feeAssetId;
      expectedGasBalance += adjustedGasValues[asset][tx.txType] - unadjustedGasValues[asset][tx.txType];
    }
    expect(rollupProfile).toBeTruthy();
    expect(rollupProfile.published).toBe(false);
    expect(rollupProfile.rollupSize).toBe(20);
    expect(rollupProfile.gasBalance).toBe(expectedGasBalance);
    expect(rollupProfile.bridgeProfiles).toBeTruthy();
    expect([...rollupProfile.bridgeProfiles.values()].length).toBe(0);
    expect(rollupProfile.earliestTx.getTime()).toEqual(txs[0].created.getTime());
    expect(rollupProfile.latestTx.getTime()).toEqual(txs[8].created.getTime());
    expect(rollupProfile.totalTxs).toBe(9);

    const totalGas =
      txs.reduce((prev, current) => prev + unadjustedGasValues[getAsset(current)][current.txType], 0) +
      numEmptySlots * BASE_GAS;
    const totalCallData = txs.reduce((prev, current) => prev + callDataValues[current.txType], 0);
    expect(rollupProfile.totalGas).toBe(totalGas);
    expect(rollupProfile.totalCallData).toBe(totalCallData);
  });

  it('gives profile for payment and defi txs', () => {
    const txs = [
      mockTx(0, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
      mockTx(1, { txType: TxType.ACCOUNT, txFeeAssetId: 1 }),
      mockTx(2, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
      mockTx(3, { txType: TxType.WITHDRAW_HIGH_GAS, txFeeAssetId: 0 }),
      mockTx(4, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
      mockTx(5, { txType: TxType.TRANSFER, txFeeAssetId: 1 }),
      mockTx(6, { txType: TxType.WITHDRAW_TO_WALLET, txFeeAssetId: 0, excessGas: 2 * BASE_GAS }),
      mockTx(7, { txType: TxType.DEPOSIT, txFeeAssetId: 0, excessGas: 3 * BASE_GAS }),
      mockTx(8, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 1 }),
      mockTx(9, {
        txType: TxType.DEFI_DEPOSIT,
        excessGas: 0,
        txFeeAssetId: 0,
        bridgeId: bridgeConfigs[0].bridgeId,
      }),
      mockTx(10, {
        txType: TxType.DEFI_DEPOSIT,
        excessGas: 0,
        txFeeAssetId: 0,
        bridgeId: bridgeConfigs[0].bridgeId,
      }),
      mockTx(11, {
        txType: TxType.DEFI_DEPOSIT,
        excessGas: 0,
        txFeeAssetId: 0,
        bridgeId: bridgeConfigs[0].bridgeId,
      }),
      mockTx(12, {
        txType: TxType.DEFI_DEPOSIT,
        excessGas: 0,
        txFeeAssetId: 0,
        bridgeId: bridgeConfigs[0].bridgeId,
      }),
      mockTx(13, {
        txType: TxType.DEFI_DEPOSIT,
        excessGas: 0,
        txFeeAssetId: 0,
        bridgeId: bridgeConfigs[0].bridgeId,
      }),
      mockTx(14, {
        txType: TxType.DEFI_DEPOSIT,
        excessGas: 33000,
        txFeeAssetId: 0,
        bridgeId: bridgeConfigs[0].bridgeId,
      }),
      mockTx(15, {
        txType: TxType.DEFI_DEPOSIT,
        excessGas: 0,
        txFeeAssetId: 0,
        bridgeId: bridgeConfigs[1].bridgeId,
      }),
      mockTx(16, {
        txType: TxType.DEFI_DEPOSIT,
        excessGas: 25000,
        txFeeAssetId: 0,
        bridgeId: bridgeConfigs[1].bridgeId,
      }),
    ];

    const rollupTxs = txs.map(createRollupTx);
    const rollupProfile = profileRollup(rollupTxs, feeResolver as any, 5, 30);
    expect(rollupProfile).toBeTruthy();
    expect(rollupProfile.published).toBe(false);
    expect(rollupProfile.rollupSize).toBe(30);
    expect(rollupProfile.earliestTx.getTime()).toEqual(txs[0].created.getTime());
    expect(rollupProfile.latestTx.getTime()).toEqual(txs[16].created.getTime());
    // we have
    // 9 non defi deposits
    // 5 * BASE_GAS excess from payments
    // 1 bridge call for bridgeConfig[0]
    // 6 txs for bridgeConfig[0] so gas provided == 6 * (bridgeConfig[0].fee / bridgeConfig[0].numTxs)
    // 33000 excess gas on one tx for bridgeConfig[0]
    // 1 bridge call for bridgeConfig[1]
    // 2 txs for bridgeConfig[0] so gas provided == 2 * (bridgeConfig[1].fee / bridgeConfig[1].numTxs)
    // 25000 excess gas on one tx for bridgeConfig[1]
    // 13 empty slots so -13 * BASE_GAS
    // additionally each tx will have a tx gas adjustment based on it's tx type
    const numEmptySlots = 13;
    let expectedGasBalance = 5 * BASE_GAS;
    expectedGasBalance += 6 * getSingleBridgeCost(bridgeConfigs[0].bridgeId);
    expectedGasBalance += 33000;
    expectedGasBalance += 2 * getSingleBridgeCost(bridgeConfigs[1].bridgeId);
    expectedGasBalance += 25000;
    expectedGasBalance -= getBridgeCost(bridgeConfigs[0].bridgeId);
    expectedGasBalance -= getBridgeCost(bridgeConfigs[1].bridgeId);
    expectedGasBalance -= numEmptySlots * BASE_GAS;
    for (const tx of txs) {
      const asset = new ProofData(tx.proofData).feeAssetId;
      expectedGasBalance += adjustedGasValues[asset][tx.txType] - unadjustedGasValues[asset][tx.txType];
    }
    expect(rollupProfile.gasBalance).toEqual(expectedGasBalance);
    expect(rollupProfile.bridgeProfiles).toBeTruthy();

    expect([...rollupProfile.bridgeProfiles.values()].length).toBe(2);
    expect(rollupProfile.totalTxs).toBe(17);

    const bridgeProfiles: BridgeProfile[] = [
      {
        bridgeId: bridgeConfigs[0].bridgeId,
        numTxs: 6,
        gasThreshold: getBridgeCost(bridgeConfigs[0].bridgeId),
        gasAccrued: rollupTxs
          .filter(tx => tx.bridgeId && tx.bridgeId === bridgeConfigs[0].bridgeId)
          .map(tx => getSingleBridgeCost(bridgeConfigs[0].bridgeId) + tx.excessGas)
          .reduce((p, n) => n + p, 0),
        earliestTx: txs[9].created,
        latestTx: txs[14].created,
      },
      {
        bridgeId: bridgeConfigs[1].bridgeId,
        numTxs: 2,
        gasThreshold: getBridgeCost(bridgeConfigs[1].bridgeId),
        gasAccrued: rollupTxs
          .filter(tx => tx.bridgeId && tx.bridgeId === bridgeConfigs[1].bridgeId)
          .map(tx => getSingleBridgeCost(bridgeConfigs[1].bridgeId) + tx.excessGas)
          .reduce((p, n) => n + p, 0),
        earliestTx: txs[15].created,
        latestTx: txs[16].created,
      },
    ];
    expect([...rollupProfile.bridgeProfiles.values()]).toEqual(bridgeProfiles);

    const totalGas =
      txs.reduce((prev, current) => prev + unadjustedGasValues[getAsset(current)][current.txType], 0) +
      bridgeConfigs[0].gas +
      bridgeConfigs[1].gas +
      numEmptySlots * BASE_GAS;
    const totalCallData = txs.reduce((prev, current) => prev + callDataValues[current.txType], 0);
    expect(rollupProfile.totalGas).toBe(totalGas);
    expect(rollupProfile.totalCallData).toBe(totalCallData);
  });

  it('correclty profiles tx times', () => {
    const txs = [
      mockTx(0, { txType: TxType.DEFI_DEPOSIT, bridgeId: bridgeConfigs[0].bridgeId }),
      mockTx(1, { txType: TxType.DEFI_DEPOSIT, bridgeId: bridgeConfigs[0].bridgeId }),
      mockTx(2, { txType: TxType.DEFI_DEPOSIT, bridgeId: bridgeConfigs[1].bridgeId }),
      mockTx(3, { txType: TxType.DEFI_DEPOSIT, bridgeId: bridgeConfigs[0].bridgeId }),
      mockTx(4, { txType: TxType.DEFI_DEPOSIT, bridgeId: bridgeConfigs[1].bridgeId }),
      mockTx(5, { txType: TxType.TRANSFER }),
      mockTx(6, { txType: TxType.DEFI_DEPOSIT, bridgeId: bridgeConfigs[0].bridgeId }),
      mockTx(7, { txType: TxType.DEFI_DEPOSIT, bridgeId: bridgeConfigs[1].bridgeId }),
      mockTx(8, { txType: TxType.DEFI_CLAIM }),
      mockTx(9, { txType: TxType.DEFI_DEPOSIT, bridgeId: bridgeConfigs[2].bridgeId }),
    ];

    const rollupTxs = txs.map(createRollupTx);
    const rollupProfile = profileRollup(rollupTxs, feeResolver as any, 5, 30);
    expect(rollupProfile).toBeTruthy();
    expect(rollupProfile.totalTxs).toBe(10);
    expect(rollupProfile.rollupSize).toBe(30);
    expect(rollupProfile.earliestTx.getTime()).toEqual(txs[0].created.getTime());
    expect(rollupProfile.latestTx.getTime()).toEqual(txs[9].created.getTime());

    // we should have 3 bridge profiles with the correct earliest and latest tx times
    expect(rollupProfile.bridgeProfiles).toBeTruthy();

    expect([...rollupProfile.bridgeProfiles.values()].length).toBe(3);

    const bridgeProfiles: BridgeProfile[] = [
      {
        bridgeId: bridgeConfigs[0].bridgeId,
        numTxs: 4,
        gasThreshold: getBridgeCost(bridgeConfigs[0].bridgeId),
        gasAccrued: rollupTxs
          .filter(tx => tx.bridgeId && tx.bridgeId === bridgeConfigs[0].bridgeId)
          .map(tx => getSingleBridgeCost(bridgeConfigs[0].bridgeId) + tx.excessGas)
          .reduce((p, n) => n + p, 0),
        earliestTx: txs[0].created,
        latestTx: txs[6].created,
      },
      {
        bridgeId: bridgeConfigs[1].bridgeId,
        numTxs: 3,
        gasThreshold: getBridgeCost(bridgeConfigs[1].bridgeId),
        gasAccrued: rollupTxs
          .filter(tx => tx.bridgeId && tx.bridgeId === bridgeConfigs[1].bridgeId)
          .map(tx => getSingleBridgeCost(bridgeConfigs[1].bridgeId) + tx.excessGas)
          .reduce((p, n) => n + p, 0),
        earliestTx: txs[2].created,
        latestTx: txs[7].created,
      },
      {
        bridgeId: bridgeConfigs[2].bridgeId,
        numTxs: 1,
        gasThreshold: getBridgeCost(bridgeConfigs[2].bridgeId),
        gasAccrued: rollupTxs
          .filter(tx => tx.bridgeId && tx.bridgeId === bridgeConfigs[2].bridgeId)
          .map(tx => getSingleBridgeCost(bridgeConfigs[2].bridgeId) + tx.excessGas)
          .reduce((p, n) => n + p, 0),
        earliestTx: txs[9].created,
        latestTx: txs[9].created,
      },
    ];
    expect([...rollupProfile.bridgeProfiles.values()]).toEqual(bridgeProfiles);
  });

  it('produces correct times if only defi', () => {
    const txs = [
      mockTx(0, { txType: TxType.DEFI_DEPOSIT, bridgeId: bridgeConfigs[0].bridgeId }),
      mockTx(1, { txType: TxType.DEFI_DEPOSIT, bridgeId: bridgeConfigs[0].bridgeId }),
      mockTx(2, { txType: TxType.DEFI_DEPOSIT, bridgeId: bridgeConfigs[1].bridgeId }),
      mockTx(3, { txType: TxType.DEFI_DEPOSIT, bridgeId: bridgeConfigs[0].bridgeId }),
      mockTx(4, { txType: TxType.DEFI_DEPOSIT, bridgeId: bridgeConfigs[1].bridgeId }),
      mockTx(5, { txType: TxType.DEFI_DEPOSIT, bridgeId: bridgeConfigs[0].bridgeId }),
      mockTx(6, { txType: TxType.DEFI_DEPOSIT, bridgeId: bridgeConfigs[1].bridgeId }),
      mockTx(7, { txType: TxType.DEFI_DEPOSIT, bridgeId: bridgeConfigs[2].bridgeId }),
    ];

    const rollupTxs = txs.map(createRollupTx);
    const rollupProfile = profileRollup(rollupTxs, feeResolver as any, 5, 30);
    expect(rollupProfile).toBeTruthy();
    expect(rollupProfile.totalTxs).toBe(8);
    expect(rollupProfile.rollupSize).toBe(30);
    expect(rollupProfile.earliestTx.getTime()).toEqual(txs[0].created.getTime());
    expect(rollupProfile.latestTx.getTime()).toEqual(txs[7].created.getTime());

    // we should have 3 bridge profiles with the correct earliest and latest tx times
    expect(rollupProfile.bridgeProfiles).toBeTruthy();

    expect([...rollupProfile.bridgeProfiles.values()].length).toBe(3);

    const bridgeProfiles: BridgeProfile[] = [
      {
        bridgeId: bridgeConfigs[0].bridgeId,
        numTxs: 4,
        gasThreshold: getBridgeCost(bridgeConfigs[0].bridgeId),
        gasAccrued: rollupTxs
          .filter(tx => tx.bridgeId && tx.bridgeId === bridgeConfigs[0].bridgeId)
          .map(tx => getSingleBridgeCost(bridgeConfigs[0].bridgeId) + tx.excessGas)
          .reduce((p, n) => n + p, 0),
        earliestTx: txs[0].created,
        latestTx: txs[5].created,
      },
      {
        bridgeId: bridgeConfigs[1].bridgeId,
        numTxs: 3,
        gasThreshold: getBridgeCost(bridgeConfigs[1].bridgeId),
        gasAccrued: rollupTxs
          .filter(tx => tx.bridgeId && tx.bridgeId === bridgeConfigs[1].bridgeId)
          .map(tx => getSingleBridgeCost(bridgeConfigs[1].bridgeId) + tx.excessGas)
          .reduce((p, n) => n + p, 0),
        earliestTx: txs[2].created,
        latestTx: txs[6].created,
      },
      {
        bridgeId: bridgeConfigs[2].bridgeId,
        numTxs: 1,
        gasThreshold: getBridgeCost(bridgeConfigs[2].bridgeId),
        gasAccrued: rollupTxs
          .filter(tx => tx.bridgeId && tx.bridgeId === bridgeConfigs[2].bridgeId)
          .map(tx => getSingleBridgeCost(bridgeConfigs[2].bridgeId) + tx.excessGas)
          .reduce((p, n) => n + p, 0),
        earliestTx: txs[7].created,
        latestTx: txs[7].created,
      },
    ];
    expect([...rollupProfile.bridgeProfiles.values()]).toEqual(bridgeProfiles);
  });
});

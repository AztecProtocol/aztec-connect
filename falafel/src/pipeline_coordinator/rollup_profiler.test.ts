import { toBigIntBE, toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeConfig, BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofData } from '@aztec/barretenberg/client_proofs';
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
    fee: 500000n,
    rollupFrequency: 2,
  },
  {
    bridgeId: 2n,
    numTxs: 2,
    fee: 500000n,
    rollupFrequency: 3,
  },
];

const BASE_GAS = 20000n;

describe('Profile Rollup', () => {
  let feeResolver: Mockify<TxFeeResolver>;

  const currentTime = new Date('2021-06-20T11:45:00+01:00');

  const getCurrentTime = () => currentTime;

  const txTypeToProofId = (txType: TxType) => (txType < TxType.WITHDRAW_TO_CONTRACT ? txType + 1 : txType);

  const mockTx = (
    id: number,
    {
      txType = TxType.TRANSFER,
      txFeeAssetId = 0,
      excessGas = 0n,
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
      excessGas: excessGas,
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

  const createRollupTx = (rawTx: TxDao) => {
    const proof = new ProofData(rawTx.proofData);
    const rollupTx = {
      tx: rawTx,
      excessGas: rawTx.excessGas,
      feeAsset: proof.txFeeAssetId.readUInt32BE(28),
      bridgeId: toBigIntBE(proof.bridgeId),
    } as RollupTx;
    return rollupTx;
  };

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
    const bridgeCost = bridgeConfig.fee!;
    const numTxs = BigInt(bridgeConfig.numTxs);
    const gas = bridgeCost / numTxs;
    return bridgeCost % numTxs > 0n ? gas + 1n : gas;
  };

  const randomInt = (to = 2 ** 32 - 1) => Math.floor(Math.random() * (to + 1));

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => getCurrentTime().getTime());

    feeResolver = {
      setConf: jest.fn(),
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
  });

  it('gives profile for zero txs', () => {
    const rollupProfile = profileRollup([], feeResolver as any, 5, 20);
    expect(rollupProfile).toBeTruthy();
    expect(rollupProfile.published).toBe(false);
    expect(rollupProfile.rollupSize).toBe(20);
    expect(rollupProfile.gasBalance).toBe(BASE_GAS * -20n);
    expect(rollupProfile.bridgeProfiles).toBeTruthy();
    expect([...rollupProfile.bridgeProfiles.values()].length).toBe(0);
    expect(rollupProfile.totalTxs).toBe(0);
  });

  it('gives profile for non defi txs', () => {
    const txs = [
      mockTx(0, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
      mockTx(1, { txType: TxType.ACCOUNT, txFeeAssetId: 0 }),
      mockTx(3, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
      mockTx(4, { txType: TxType.WITHDRAW_TO_CONTRACT, txFeeAssetId: 0 }),
      mockTx(5, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
      mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      mockTx(7, { txType: TxType.WITHDRAW_TO_WALLET, txFeeAssetId: 0 }),
      mockTx(8, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
      mockTx(10, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
    ];

    const rollupTxs = txs.map(createRollupTx);
    const rollupProfile = profileRollup(rollupTxs, feeResolver as any, 5, 20);
    expect(rollupProfile).toBeTruthy();
    expect(rollupProfile.published).toBe(false);
    expect(rollupProfile.rollupSize).toBe(20);
    expect(rollupProfile.gasBalance).toBe(-11n * BASE_GAS); // 11 empty slots
    expect(rollupProfile.bridgeProfiles).toBeTruthy();
    expect([...rollupProfile.bridgeProfiles.values()].length).toBe(0);
    expect(rollupProfile.earliestTx.getTime()).toEqual(txs[0].created.getTime());
    expect(rollupProfile.latestTx.getTime()).toEqual(txs[8].created.getTime());
    expect(rollupProfile.totalTxs).toBe(9);
  });

  it('correctly accounts for excess gas provided', () => {
    const txs = [
      mockTx(0, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
      mockTx(1, { txType: TxType.ACCOUNT, txFeeAssetId: 0 }),
      mockTx(3, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
      mockTx(4, { txType: TxType.WITHDRAW_TO_CONTRACT, txFeeAssetId: 0 }),
      mockTx(5, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
      mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 0, excessGas: 2n * BASE_GAS }),
      mockTx(7, { txType: TxType.WITHDRAW_TO_WALLET, txFeeAssetId: 0 }),
      mockTx(8, { txType: TxType.DEPOSIT, txFeeAssetId: 0, excessGas: 3n * BASE_GAS }),
      mockTx(10, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
    ];

    const rollupTxs = txs.map(createRollupTx);
    const rollupProfile = profileRollup(rollupTxs, feeResolver as any, 5, 20);
    expect(rollupProfile).toBeTruthy();
    expect(rollupProfile.published).toBe(false);
    expect(rollupProfile.rollupSize).toBe(20);
    expect(rollupProfile.gasBalance).toBe(-6n * BASE_GAS); // 11 empty slots but 5 are paid for with excess gas
    expect(rollupProfile.bridgeProfiles).toBeTruthy();
    expect([...rollupProfile.bridgeProfiles.values()].length).toBe(0);
    expect(rollupProfile.earliestTx.getTime()).toEqual(txs[0].created.getTime());
    expect(rollupProfile.latestTx.getTime()).toEqual(txs[8].created.getTime());
    expect(rollupProfile.totalTxs).toBe(9);
  });

  it('becomes profitable with excess gas', () => {
    const txs = [
      mockTx(0, { txType: TxType.DEPOSIT, txFeeAssetId: 0, excessGas: 7n * BASE_GAS }),
      mockTx(1, { txType: TxType.ACCOUNT, txFeeAssetId: 0 }),
      mockTx(3, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
      mockTx(4, { txType: TxType.WITHDRAW_TO_CONTRACT, txFeeAssetId: 0 }),
      mockTx(5, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
      mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: 0, excessGas: 2n * BASE_GAS }),
      mockTx(7, { txType: TxType.WITHDRAW_TO_WALLET, txFeeAssetId: 0 }),
      mockTx(8, { txType: TxType.DEPOSIT, txFeeAssetId: 0, excessGas: 3n * BASE_GAS }),
      mockTx(10, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
    ];

    const rollupTxs = txs.map(createRollupTx);
    const rollupProfile = profileRollup(rollupTxs, feeResolver as any, 5, 20);
    expect(rollupProfile).toBeTruthy();
    expect(rollupProfile.published).toBe(false);
    expect(rollupProfile.rollupSize).toBe(20);
    expect(rollupProfile.gasBalance).toBe(BASE_GAS); // 11 empty slots but we have 12 slots worth of excess gas
    expect(rollupProfile.bridgeProfiles).toBeTruthy();
    expect([...rollupProfile.bridgeProfiles.values()].length).toBe(0);
    expect(rollupProfile.earliestTx.getTime()).toEqual(txs[0].created.getTime());
    expect(rollupProfile.latestTx.getTime()).toEqual(txs[8].created.getTime());
    expect(rollupProfile.totalTxs).toBe(9);
  });

  it('gives profile for payment and defi txs', () => {
    const txs = [
      mockTx(0, { txType: TxType.DEPOSIT, txFeeAssetId: 0 }),
      mockTx(1, { txType: TxType.ACCOUNT, txFeeAssetId: 0 }),
      mockTx(2, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
      mockTx(3, { txType: TxType.WITHDRAW_TO_CONTRACT, txFeeAssetId: 0 }),
      mockTx(4, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
      mockTx(5, { txType: TxType.TRANSFER, txFeeAssetId: 0 }),
      mockTx(6, { txType: TxType.WITHDRAW_TO_WALLET, txFeeAssetId: 0, excessGas: 2n * BASE_GAS }),
      mockTx(7, { txType: TxType.DEPOSIT, txFeeAssetId: 0, excessGas: 3n * BASE_GAS }),
      mockTx(8, { txType: TxType.DEFI_CLAIM, txFeeAssetId: 0 }),
      mockTx(9, {
        txType: TxType.DEFI_DEPOSIT,
        excessGas: 0n,
        txFeeAssetId: 0,
        bridgeId: bridgeConfigs[0].bridgeId,
      }),
      mockTx(10, {
        txType: TxType.DEFI_DEPOSIT,
        excessGas: 0n,
        txFeeAssetId: 0,
        bridgeId: bridgeConfigs[0].bridgeId,
      }),
      mockTx(11, {
        txType: TxType.DEFI_DEPOSIT,
        excessGas: 0n,
        txFeeAssetId: 0,
        bridgeId: bridgeConfigs[0].bridgeId,
      }),
      mockTx(12, {
        txType: TxType.DEFI_DEPOSIT,
        excessGas: 0n,
        txFeeAssetId: 0,
        bridgeId: bridgeConfigs[0].bridgeId,
      }),
      mockTx(13, {
        txType: TxType.DEFI_DEPOSIT,
        excessGas: 0n,
        txFeeAssetId: 0,
        bridgeId: bridgeConfigs[0].bridgeId,
      }),
      mockTx(14, {
        txType: TxType.DEFI_DEPOSIT,
        excessGas: 33000n,
        txFeeAssetId: 0,
        bridgeId: bridgeConfigs[0].bridgeId,
      }),
      mockTx(15, {
        txType: TxType.DEFI_DEPOSIT,
        excessGas: 0n,
        txFeeAssetId: 0,
        bridgeId: bridgeConfigs[1].bridgeId,
      }),
      mockTx(16, {
        txType: TxType.DEFI_DEPOSIT,
        excessGas: 25000n,
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
    // 9 payments
    // 5 * BASE_GAS excess from payments
    // 1 bridge call for bridgeConfig[0]
    // 6 txs for bridgeConfig[0] so gas provided == 6 * (bridgeConfig[0].fee / bridgeConfig[0].numTxs)
    // 33000 excess gas on one tx for bridgeConfig[0]
    // 1 bridge call for bridgeConfig[1]
    // 2 txs for bridgeConfig[0] so gas provided == 2 * (bridgeConfig[1].fee / bridgeConfig[1].numTxs)
    // 25000 excess gas on one tx for bridgeConfig[1]
    // 13 empty slots so -13 * BASE_GAS
    let expectedGasBalance = 5n * BASE_GAS;
    expectedGasBalance += 6n * getSingleBridgeCost(bridgeConfigs[0].bridgeId);
    expectedGasBalance += 33000n;
    expectedGasBalance += 2n * getSingleBridgeCost(bridgeConfigs[1].bridgeId);
    expectedGasBalance += 25000n;
    expectedGasBalance -= getBridgeCost(bridgeConfigs[0].bridgeId);
    expectedGasBalance -= getBridgeCost(bridgeConfigs[1].bridgeId);
    expectedGasBalance -= 13n * BASE_GAS;
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
          .reduce((p, n) => n + p, 0n),
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
          .reduce((p, n) => n + p, 0n),
        earliestTx: txs[15].created,
        latestTx: txs[16].created,
      },
    ];
    expect([...rollupProfile.bridgeProfiles.values()]).toEqual(bridgeProfiles);
  });
});

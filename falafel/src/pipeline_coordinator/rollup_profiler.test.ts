import { AssetId } from '@aztec/barretenberg/asset';
import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeId, BitConfig, BridgeConfig } from '@aztec/barretenberg/bridge_id';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { TxDao } from '../entity/tx';
import { BridgeProfile, profileRollup } from './rollup_profiler';
import { TxFeeResolver } from '../tx_fee_resolver';
import { BridgeCostResolver } from '../tx_fee_resolver/bridge_cost_resolver';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { randomBytes } from 'crypto';
import { ProofData } from '@aztec/barretenberg/client_proofs';
import { RollupTx } from './bridge_tx_queue';

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

const bridgeConfigs: BridgeConfig[] = [
  {
    bridgeId: BridgeId.fromBuffer(Buffer.alloc(32, 1)),
    numTxs: 5,
    fee: 500000n,
    rollupFrequency: 2,
  },
  {
    bridgeId: BridgeId.fromBuffer(Buffer.alloc(32, 2)),
    numTxs: 2,
    fee: 500000n,
    rollupFrequency: 3,
  },
];

const BASE_GAS = 20000n;
const NON_DEFI_TX_GAS = 100000n;

describe('Profile Rollup', () => {
  let feeResolver: Mockify<TxFeeResolver>;
  let bridgeCostResolver: Mockify<BridgeCostResolver>;

  const currentTime = new Date('2021-06-20T11:45:00+01:00');

  const getCurrentTime = () => currentTime;

  const txTypeToProofId = (txType: TxType) => (txType < TxType.WITHDRAW_TO_CONTRACT ? txType + 1 : txType);

  const mockTx = (
    id: number,
    {
      txType = TxType.TRANSFER,
      txFeeAssetId = AssetId.ETH,
      txFee = BASE_GAS + NON_DEFI_TX_GAS,
      creationTime = new Date(new Date('2021-06-20T11:43:00+01:00').getTime() + id), // ensures txs are ordered by id
      bridgeId = new BridgeId(randomInt(), 1, 0, 1, 0, new BitConfig(false, false, false, false, false, false), 0),
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
      proofData: Buffer.concat([
        numToUInt32BE(txTypeToProofId(txType), 32),
        noteCommitment1,
        noteCommitment2,
        randomBytes(6 * 32),
        toBufferBE(txFee, 32),
        numToUInt32BE(txFeeAssetId, 32),
        bridgeId.toBuffer(),
        randomBytes(3 * 32),
        backwardLink,
        allowChain,
      ]),
    } as any as TxDao);

  const createRollupTx = (rawTx: TxDao) => {
    const proof = new ProofData(rawTx.proofData);
    const rollupTx = {
      tx: rawTx,
      fee: toBigIntBE(proof.txFee),
      feeAsset: proof.txFeeAssetId.readUInt32BE(28),
      bridgeId: BridgeId.fromBuffer(proof.bridgeId),
    } as RollupTx;
    return rollupTx;
  };

  const getBridgeCost = (bridgeId: BridgeId) => {
    const bridgeConfig = bridgeConfigs.find(bc => bc.bridgeId.equals(bridgeId));
    if (!bridgeConfig) {
      throw new Error(`Requested cost for invalid bridge ID: ${bridgeId.toString()}`);
    }
    return bridgeConfig.fee;
  };

  const randomInt = (to = 2 ** 32 - 1) => Math.floor(Math.random() * (to + 1));

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => getCurrentTime().getTime());

    bridgeCostResolver = {
      getBridgeCost: jest.fn().mockImplementation((bridgeId: BridgeId) => getBridgeCost(bridgeId)),
    };

    feeResolver = {
      getMinTxFee: jest.fn().mockImplementation(() => {
        throw new Error('This should not be called');
      }),
      start: jest.fn(),
      stop: jest.fn(),
      getFeeQuotes: jest.fn(),
      computeSurplusRatio: jest.fn(),
      getGasPaidForByFee: jest.fn().mockImplementation((assetId: AssetId, fee: bigint) => fee),
      getBaseTxGas: jest.fn().mockReturnValue(BASE_GAS),
      getTxGas: jest.fn().mockImplementation((assetId: AssetId, txType: TxType) => {
        if (txType === TxType.DEFI_DEPOSIT) {
          throw new Error('This should not be called');
        }
        return BASE_GAS + NON_DEFI_TX_GAS;
      }),
    };
  });

  it('gives profile for zero txs', () => {
    const rollupProfile = profileRollup([], bridgeConfigs, feeResolver as any, 20, bridgeCostResolver as any);
    expect(rollupProfile).toBeTruthy();
    expect(rollupProfile.published).toBe(false);
    expect(rollupProfile.rollupSize).toBe(20);
    expect(rollupProfile.totalGasEarnt).toBe(0n);
    expect(rollupProfile.totalGasCost).toBe(BASE_GAS * 20n);
    expect(rollupProfile.bridgeProfiles).toBeTruthy();
    expect(rollupProfile.bridgeProfiles.length).toBe(0);
    expect(rollupProfile.totalTxs).toBe(0);
  });

  it('gives profile for payment txs', () => {
    const txs = [
      mockTx(0, { txType: TxType.DEPOSIT, txFeeAssetId: AssetId.ETH }),
      mockTx(1, { txType: TxType.ACCOUNT, txFeeAssetId: AssetId.ETH }),
      mockTx(3, { txType: TxType.DEFI_CLAIM, txFeeAssetId: AssetId.ETH }),
      mockTx(4, { txType: TxType.WITHDRAW_TO_CONTRACT, txFeeAssetId: AssetId.ETH }),
      mockTx(5, { txType: TxType.DEFI_CLAIM, txFeeAssetId: AssetId.ETH }),
      mockTx(6, { txType: TxType.TRANSFER, txFeeAssetId: AssetId.ETH }),
      mockTx(7, { txType: TxType.WITHDRAW_TO_WALLET, txFeeAssetId: AssetId.ETH }),
      mockTx(8, { txType: TxType.DEPOSIT, txFeeAssetId: AssetId.ETH }),
      mockTx(10, { txType: TxType.DEFI_CLAIM, txFeeAssetId: AssetId.ETH }),
    ];

    const rollupTxs = txs.map(createRollupTx);
    const rollupProfile = profileRollup(rollupTxs, bridgeConfigs, feeResolver as any, 20, bridgeCostResolver as any);
    expect(rollupProfile).toBeTruthy();
    expect(rollupProfile.published).toBe(false);
    expect(rollupProfile.rollupSize).toBe(20);
    expect(rollupProfile.totalGasEarnt).toBe(rollupTxs.map(tx => tx.fee).reduce((p, n) => p + n, 0n));
    expect(rollupProfile.totalGasCost).toBe(20n * BASE_GAS + 9n * NON_DEFI_TX_GAS); // 9 payments, 11 empty slots
    expect(rollupProfile.bridgeProfiles).toBeTruthy();
    expect(rollupProfile.bridgeProfiles.length).toBe(0);
    expect(rollupProfile.earliestTx.getTime()).toEqual(txs[0].created.getTime());
    expect(rollupProfile.latestTx.getTime()).toEqual(txs[8].created.getTime());
    expect(rollupProfile.totalTxs).toBe(9);
  });

  it('gives profile for payment and defi txs', () => {
    const txs = [
      mockTx(0, { txType: TxType.DEPOSIT, txFeeAssetId: AssetId.ETH }),
      mockTx(1, { txType: TxType.ACCOUNT, txFeeAssetId: AssetId.ETH }),
      mockTx(2, { txType: TxType.DEFI_CLAIM, txFeeAssetId: AssetId.ETH }),
      mockTx(3, { txType: TxType.WITHDRAW_TO_CONTRACT, txFeeAssetId: AssetId.ETH }),
      mockTx(4, { txType: TxType.DEFI_CLAIM, txFeeAssetId: AssetId.ETH }),
      mockTx(5, { txType: TxType.TRANSFER, txFeeAssetId: AssetId.ETH }),
      mockTx(6, { txType: TxType.WITHDRAW_TO_WALLET, txFeeAssetId: AssetId.ETH }),
      mockTx(7, { txType: TxType.DEPOSIT, txFeeAssetId: AssetId.ETH }),
      mockTx(8, { txType: TxType.DEFI_CLAIM, txFeeAssetId: AssetId.ETH }),
      mockTx(9, {
        txType: TxType.DEFI_DEPOSIT,
        txFee: 100000n,
        txFeeAssetId: AssetId.ETH,
        bridgeId: bridgeConfigs[0].bridgeId,
      }),
      mockTx(10, {
        txType: TxType.DEFI_DEPOSIT,
        txFee: 100000n,
        txFeeAssetId: AssetId.ETH,
        bridgeId: bridgeConfigs[0].bridgeId,
      }),
      mockTx(11, {
        txType: TxType.DEFI_DEPOSIT,
        txFee: 100000n,
        txFeeAssetId: AssetId.ETH,
        bridgeId: bridgeConfigs[0].bridgeId,
      }),
      mockTx(12, {
        txType: TxType.DEFI_DEPOSIT,
        txFee: 100000n,
        txFeeAssetId: AssetId.ETH,
        bridgeId: bridgeConfigs[0].bridgeId,
      }),
      mockTx(13, {
        txType: TxType.DEFI_DEPOSIT,
        txFee: 100000n,
        txFeeAssetId: AssetId.ETH,
        bridgeId: bridgeConfigs[0].bridgeId,
      }),
      mockTx(14, {
        txType: TxType.DEFI_DEPOSIT,
        txFee: 100000n,
        txFeeAssetId: AssetId.ETH,
        bridgeId: bridgeConfigs[0].bridgeId,
      }),
      mockTx(15, {
        txType: TxType.DEFI_DEPOSIT,
        txFee: 1000000n,
        txFeeAssetId: AssetId.ETH,
        bridgeId: bridgeConfigs[1].bridgeId,
      }),
      mockTx(16, {
        txType: TxType.DEFI_DEPOSIT,
        txFee: 1000000n,
        txFeeAssetId: AssetId.ETH,
        bridgeId: bridgeConfigs[1].bridgeId,
      }),
    ];

    const rollupTxs = txs.map(createRollupTx);
    const rollupProfile = profileRollup(rollupTxs, bridgeConfigs, feeResolver as any, 30, bridgeCostResolver as any);
    expect(rollupProfile).toBeTruthy();
    expect(rollupProfile.published).toBe(false);
    expect(rollupProfile.rollupSize).toBe(30);
    expect(rollupProfile.earliestTx.getTime()).toEqual(txs[0].created.getTime());
    expect(rollupProfile.latestTx.getTime()).toEqual(txs[16].created.getTime());
    expect(rollupProfile.totalGasEarnt).toBe(rollupTxs.map(tx => tx.fee).reduce((p, n) => p + n, 0n));
    // 9 payments, 8 defi txs, 13 empty slots, 1 bridge[0] interaction, 1 bridge[1] interaction
    // although there are greater that bridge[0].numTxs for bridge 0, it is only 1 bridge call
    expect(rollupProfile.totalGasCost).toBe(
      30n * BASE_GAS + 9n * NON_DEFI_TX_GAS + bridgeConfigs[0].fee + bridgeConfigs[1].fee,
    );
    expect(rollupProfile.bridgeProfiles).toBeTruthy();
    expect(rollupProfile.bridgeProfiles.length).toBe(2);
    expect(rollupProfile.totalTxs).toBe(17);

    const bridgeProfiles: BridgeProfile[] = [
      {
        bridgeId: bridgeConfigs[0].bridgeId,
        numTxs: 6,
        totalGasCost: 6n * BASE_GAS + bridgeConfigs[0].fee,
        totalGasEarnt: rollupTxs
          .filter(tx => tx.bridgeId && tx.bridgeId.equals(bridgeConfigs[0].bridgeId))
          .map(tx => tx.fee)
          .reduce((p, n) => n + p, 0n),
        earliestTx: txs[9].created,
        latestTx: txs[14].created,
      },
      {
        bridgeId: bridgeConfigs[1].bridgeId,
        numTxs: 2,
        totalGasCost: 2n * BASE_GAS + bridgeConfigs[0].fee,
        totalGasEarnt: rollupTxs
          .filter(tx => tx.bridgeId && tx.bridgeId.equals(bridgeConfigs[1].bridgeId))
          .map(tx => tx.fee)
          .reduce((p, n) => n + p, 0n),
        earliestTx: txs[15].created,
        latestTx: txs[16].created,
      },
    ];
    expect(rollupProfile.bridgeProfiles).toEqual(bridgeProfiles);
  });
});

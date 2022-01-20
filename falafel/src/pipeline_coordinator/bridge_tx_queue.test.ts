import { AssetId, AssetIds } from '@aztec/barretenberg/asset';
import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeConfig } from '@aztec/barretenberg/bridge_id';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { randomBytes } from 'crypto';
import { TxDao } from '../entity/tx';
import { TxFeeResolver } from '../tx_fee_resolver';
import { BridgeTxQueue, RollupTx } from './bridge_tx_queue';

const bridgeConfig: BridgeConfig = {
  bridgeId: 1n,
  numTxs: 5,
  fee: 500000n,
  rollupFrequency: 2,
};

const BASE_GAS = 20000n;
const NON_FEE_PAYING_ASSET = 999;

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

const mockTx = (id: number, txType: TxType, txFeeAssetId: AssetId, bridgeId: bigint) =>
  ({
    id,
    txType,
    proofData: Buffer.concat([
      numToUInt32BE(0, 32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(7 * 32),
      numToUInt32BE(txFeeAssetId, 32),
      toBufferBE(bridgeId, 32),
      randomBytes(3 * 32),
      Buffer.alloc(32),
      numToUInt32BE(2, 32),
    ]),
  } as any as TxDao);

const createRollupTx = (id: number, txType: TxType, txFeeAssetId: number, bridgeId: bigint, excessFee: bigint) => {
  const tx = mockTx(id, txType, txFeeAssetId, bridgeId);
  const rollupTx: RollupTx = {
    tx,
    excessGas: excessFee,
    feeAsset: txFeeAssetId,
    bridgeId,
  };
  return rollupTx;
};

const getFullBridgeGas = () => bridgeConfig.fee!;
const getSingleBridgeTxGas = () => bridgeConfig.fee! / BigInt(bridgeConfig.numTxs);
const getAllOtherBridgeSlotsGas = () => getFullBridgeGas() - getSingleBridgeTxGas();

describe('Bridge Tx Queue', () => {
  let feeResolver: Mockify<TxFeeResolver>;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => 1618226000000);

    feeResolver = {
      setConf: jest.fn(),
      getMinTxFee: jest.fn().mockImplementation(() => {
        throw new Error('This should not be called');
      }),
      start: jest.fn(),
      stop: jest.fn(),
      getGasPaidForByFee: jest.fn().mockImplementation((assetId: AssetId, fee: bigint) => fee),
      getBaseTxGas: jest.fn().mockReturnValue(BASE_GAS),
      getTxGas: jest.fn().mockImplementation(() => {
        throw new Error('This should not be called');
      }),
      getBridgeTxGas: jest.fn(),
      getFullBridgeGas: jest.fn().mockImplementation(getFullBridgeGas),
      getSingleBridgeTxGas: jest.fn().mockImplementation(getSingleBridgeTxGas),
      getTxFees: jest.fn(),
      getDefiFees: jest.fn(),
      isFeePayingAsset: jest.fn().mockImplementation((assetId: AssetId) => AssetIds.some(x => x === assetId)),
    };
  });

  it('returns the correct bridge id', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig, undefined);
    expect(bridgeQ.bridgeId).toEqual(bridgeConfig.bridgeId);
  });

  it("single tx that only covers it's own gas does not get returned", () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig, undefined);
    const rollupTx = createRollupTx(1, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    bridgeQ.addDefiTx(rollupTx);
    const txsForRollup = bridgeQ.getTxsToRollup(feeResolver as any, 10, new Set(), 10);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.length).toEqual(0);
  });

  it('single tx that covers the full bridge cost is returned', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig, undefined);
    const rollupTx = createRollupTx(
      1,
      TxType.DEFI_DEPOSIT,
      AssetId.ETH,
      bridgeConfig.bridgeId,
      getAllOtherBridgeSlotsGas(),
    );
    bridgeQ.addDefiTx(rollupTx);
    const txsForRollup = bridgeQ.getTxsToRollup(feeResolver as any, 10, new Set(), 10);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.length).toEqual(1);
    expect(txsForRollup[0].tx.id).toEqual(1);
  });

  it('multiple txs that cover the bridge cost are returned', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig, undefined);
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx3 = createRollupTx(3, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    bridgeQ.addDefiTx(rollupTx1);
    bridgeQ.addDefiTx(rollupTx2);
    bridgeQ.addDefiTx(rollupTx3);
    bridgeQ.addDefiTx(rollupTx4);
    bridgeQ.addDefiTx(rollupTx5);
    const txsForRollup = bridgeQ.getTxsToRollup(feeResolver as any, 10, new Set(), 10);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.length).toEqual(5);
    expect(txsForRollup.map(tx => tx.tx.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('multiple txs are returned even with a single high fee tx', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig, undefined);
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx3 = createRollupTx(
      3,
      TxType.DEFI_DEPOSIT,
      AssetId.ETH,
      bridgeConfig.bridgeId,
      getAllOtherBridgeSlotsGas(),
    );
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    bridgeQ.addDefiTx(rollupTx1);
    bridgeQ.addDefiTx(rollupTx2);
    bridgeQ.addDefiTx(rollupTx3);
    bridgeQ.addDefiTx(rollupTx4);
    bridgeQ.addDefiTx(rollupTx5);
    const txsForRollup = bridgeQ.getTxsToRollup(feeResolver as any, 10, new Set(), 10);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.length).toEqual(5);
    expect(txsForRollup.map(tx => tx.tx.id)).toEqual([3, 1, 2, 4, 5]);
  });

  it('number of returned txs is limited to max slots', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig, undefined);
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx3 = createRollupTx(
      3,
      TxType.DEFI_DEPOSIT,
      AssetId.ETH,
      bridgeConfig.bridgeId,
      getAllOtherBridgeSlotsGas(),
    );
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 220000n);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 320000n);
    bridgeQ.addDefiTx(rollupTx1);
    bridgeQ.addDefiTx(rollupTx2);
    bridgeQ.addDefiTx(rollupTx3);
    bridgeQ.addDefiTx(rollupTx4);
    bridgeQ.addDefiTx(rollupTx5);
    const txsForRollup = bridgeQ.getTxsToRollup(feeResolver as any, 3, new Set(), 10);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.length).toEqual(3);
    expect(txsForRollup.map(tx => tx.tx.id)).toEqual([3, 5, 4]);
  });

  it('multiple txs are not returned if not enough slots', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig, undefined);
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx3 = createRollupTx(3, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    bridgeQ.addDefiTx(rollupTx1);
    bridgeQ.addDefiTx(rollupTx2);
    bridgeQ.addDefiTx(rollupTx3);
    bridgeQ.addDefiTx(rollupTx4);
    bridgeQ.addDefiTx(rollupTx5);
    const txsForRollup = bridgeQ.getTxsToRollup(feeResolver as any, 3, new Set(), 10);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.length).toEqual(0);
  });

  it('multiple txs are not limited to bridge size', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig, undefined);
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx3 = createRollupTx(3, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx6 = createRollupTx(6, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx7 = createRollupTx(7, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx8 = createRollupTx(8, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    bridgeQ.addDefiTx(rollupTx1);
    bridgeQ.addDefiTx(rollupTx2);
    bridgeQ.addDefiTx(rollupTx3);
    bridgeQ.addDefiTx(rollupTx4);
    bridgeQ.addDefiTx(rollupTx5);
    bridgeQ.addDefiTx(rollupTx6);
    bridgeQ.addDefiTx(rollupTx7);
    bridgeQ.addDefiTx(rollupTx8);
    const txsForRollup = bridgeQ.getTxsToRollup(feeResolver as any, 10, new Set(), 10);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.length).toEqual(8);
    expect(txsForRollup.map(tx => tx.tx.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('multiple txs are not limited to single bridge size', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig, undefined);
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx3 = createRollupTx(3, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx6 = createRollupTx(6, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx7 = createRollupTx(7, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx8 = createRollupTx(8, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx9 = createRollupTx(9, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx10 = createRollupTx(10, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    bridgeQ.addDefiTx(rollupTx1);
    bridgeQ.addDefiTx(rollupTx2);
    bridgeQ.addDefiTx(rollupTx3);
    bridgeQ.addDefiTx(rollupTx4);
    bridgeQ.addDefiTx(rollupTx5);
    bridgeQ.addDefiTx(rollupTx6);
    bridgeQ.addDefiTx(rollupTx7);
    bridgeQ.addDefiTx(rollupTx8);
    bridgeQ.addDefiTx(rollupTx9);
    bridgeQ.addDefiTx(rollupTx10);
    const txsForRollup = bridgeQ.getTxsToRollup(feeResolver as any, 10, new Set(), 10);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.length).toEqual(10);
    expect(txsForRollup.map(tx => tx.tx.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('txs that cover full bridge cost are ordered by excess gas at front of queue', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig, undefined);
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 120000n);
    const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 130000n);
    const rollupTx3 = createRollupTx(3, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 120000n);
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 130000n);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 120000n);
    const rollupTx6 = createRollupTx(6, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 140000n);
    const rollupTx7 = createRollupTx(7, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 120000n);
    const rollupTx8 = createRollupTx(8, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 120000n);
    bridgeQ.addDefiTx(rollupTx1);
    bridgeQ.addDefiTx(rollupTx2);
    bridgeQ.addDefiTx(rollupTx3);
    bridgeQ.addDefiTx(rollupTx4);
    bridgeQ.addDefiTx(rollupTx5);
    bridgeQ.addDefiTx(rollupTx6);
    bridgeQ.addDefiTx(rollupTx7);
    bridgeQ.addDefiTx(rollupTx8);
    const txsForRollup = bridgeQ.getTxsToRollup(feeResolver as any, 10, new Set(), 10);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.length).toEqual(8);
    expect(txsForRollup.map(tx => tx.tx.id)).toEqual([6, 2, 4, 1, 3, 5, 7, 8]);
  });

  it('queue is depleted with each call', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig, undefined);
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx3 = createRollupTx(3, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx6 = createRollupTx(6, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx7 = createRollupTx(7, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx8 = createRollupTx(8, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx9 = createRollupTx(9, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx10 = createRollupTx(10, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    bridgeQ.addDefiTx(rollupTx1);
    bridgeQ.addDefiTx(rollupTx2);
    bridgeQ.addDefiTx(rollupTx3);
    bridgeQ.addDefiTx(rollupTx4);
    bridgeQ.addDefiTx(rollupTx5);
    bridgeQ.addDefiTx(rollupTx6);
    bridgeQ.addDefiTx(rollupTx7);
    bridgeQ.addDefiTx(rollupTx8);
    bridgeQ.addDefiTx(rollupTx9);
    bridgeQ.addDefiTx(rollupTx10);
    let txsForRollup = bridgeQ.getTxsToRollup(feeResolver as any, 5, new Set(), 10);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.length).toEqual(5);
    expect(txsForRollup.map(tx => tx.tx.id)).toEqual([1, 2, 3, 4, 5]);

    txsForRollup = bridgeQ.getTxsToRollup(feeResolver as any, 8, new Set(), 10);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.length).toEqual(5);
    expect(txsForRollup.map(tx => tx.tx.id)).toEqual([6, 7, 8, 9, 10]);

    txsForRollup = bridgeQ.getTxsToRollup(feeResolver as any, 8, new Set(), 10);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.length).toEqual(0);
  });

  it('multiple txs are limited by number of assets', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig, undefined);
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, AssetId.DAI, bridgeConfig.bridgeId, 0n);
    const rollupTx3 = createRollupTx(3, TxType.DEFI_DEPOSIT, AssetId.DAI, bridgeConfig.bridgeId, 1200000n);
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, AssetId.renBTC, bridgeConfig.bridgeId, 0n);
    bridgeQ.addDefiTx(rollupTx1);
    bridgeQ.addDefiTx(rollupTx2);
    bridgeQ.addDefiTx(rollupTx3);
    bridgeQ.addDefiTx(rollupTx4);
    bridgeQ.addDefiTx(rollupTx5);
    const assets = new Set<AssetId>();
    const txsForRollup = bridgeQ.getTxsToRollup(feeResolver as any, 10, assets, 1);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.length).toEqual(2);
    expect(txsForRollup.map(tx => tx.tx.id)).toEqual([3, 2]);
    expect(assets.size).toEqual(1);
    expect(assets.has(AssetId.DAI)).toBeTruthy();
  });

  it('only fee-paying assets count towards the asset limit', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig, undefined);
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, AssetId.DAI, bridgeConfig.bridgeId, 0n);
    const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, NON_FEE_PAYING_ASSET, bridgeConfig.bridgeId, 1200000n);
    const rollupTx3 = createRollupTx(3, TxType.DEFI_DEPOSIT, AssetId.DAI, bridgeConfig.bridgeId, 1200000n);
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, AssetId.ETH, bridgeConfig.bridgeId, 0n);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, AssetId.renBTC, bridgeConfig.bridgeId, 0n);
    bridgeQ.addDefiTx(rollupTx1);
    bridgeQ.addDefiTx(rollupTx2);
    bridgeQ.addDefiTx(rollupTx3);
    bridgeQ.addDefiTx(rollupTx4);
    bridgeQ.addDefiTx(rollupTx5);
    const assets = new Set<AssetId>();
    const txsForRollup = bridgeQ.getTxsToRollup(feeResolver as any, 10, assets, 1);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.length).toEqual(3);
    expect(txsForRollup.map(tx => tx.tx.id)).toEqual([2, 3, 1]);
    expect(assets.size).toEqual(1);
    expect(assets.has(AssetId.DAI)).toBeTruthy();
  });
});

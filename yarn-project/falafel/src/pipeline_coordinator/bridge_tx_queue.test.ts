import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeConfig } from '@aztec/barretenberg/rollup_provider';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { randomBytes } from 'crypto';
import { TxDao } from '../entity/tx.js';
import { TxFeeResolver } from '../tx_fee_resolver/index.js';
import { BridgeTxQueue, RollupTx, BridgeQueueStats } from './bridge_tx_queue.js';
import { jest } from '@jest/globals';

const bridgeConfig: BridgeConfig = {
  bridgeCallData: 1n,
  numTxs: 5,
  gas: 500000,
  rollupFrequency: 2,
};

const BASE_GAS = 20000;
const DEFI_DEPOSIT_GAS = 30000;
const NON_FEE_PAYING_ASSET = 999;
const TOTAL_DEFI_DEPOSIT_GAS = BASE_GAS + DEFI_DEPOSIT_GAS;
const TX_CALL_DATA = 100;

type Mockify<T> = {
  [P in keyof T]: ReturnType<typeof jest.fn>;
};

const mockTx = (id: number, txType: TxType, txFeeAssetId: number, bridgeCallData: bigint) =>
  ({
    id,
    txType,
    proofData: Buffer.concat([
      numToUInt32BE(0, 32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(7 * 32),
      numToUInt32BE(txFeeAssetId, 32),
      toBufferBE(bridgeCallData, 32),
      randomBytes(3 * 32),
      Buffer.alloc(32),
      numToUInt32BE(2, 32),
    ]),
  } as any as TxDao);

const createRollupTx = (
  id: number,
  txType: TxType,
  txFeeAssetId: number,
  bridgeCallData: bigint,
  excessGas: number,
  txFee = BigInt(1 + excessGas),
): RollupTx => {
  const tx = mockTx(id, txType, txFeeAssetId, bridgeCallData);
  return {
    tx,
    excessGas,
    fee: {
      assetId: txFeeAssetId,
      value: txFee,
    },
    bridgeCallData,
  };
};

const getFullBridgeGas = () => bridgeConfig.gas;
const getSingleBridgeTxGas = () => bridgeConfig.gas / bridgeConfig.numTxs;
const getAllOtherBridgeSlotsGas = () => getFullBridgeGas() - getSingleBridgeTxGas();

const testQueueStats = (unpublishedTxs: RollupTx[], bridgeQ: BridgeTxQueue) => {
  const expectedStats: BridgeQueueStats = {
    gasAccrued:
      unpublishedTxs.length * getSingleBridgeTxGas() +
      unpublishedTxs.reduce((prev, current) => prev + current.excessGas, 0),
    numQueuedTxs: unpublishedTxs.length,
    bridgeCallData: bridgeConfig.bridgeCallData,
  };
  expect(bridgeQ.getQueueStats()).toEqual(expectedStats);
};

describe('Bridge Tx Queue', () => {
  let feeResolver: Mockify<TxFeeResolver>;

  beforeEach(() => {
    feeResolver = {
      start: jest.fn(),
      stop: jest.fn(),
      getGasPaidForByFee: jest.fn((assetId: number, fee: bigint) => fee),
      getTxFeeFromGas: jest.fn((assetId: number, gas: bigint) => gas),
      getUnadjustedTxGas: jest.fn().mockReturnValue(BASE_GAS + DEFI_DEPOSIT_GAS),
      getAdjustedTxGas: jest.fn().mockReturnValue(BASE_GAS + DEFI_DEPOSIT_GAS),
      getAdjustedBridgeTxGas: jest.fn(),
      getUnadjustedBridgeTxGas: jest.fn(),
      getFullBridgeGas: jest.fn(getFullBridgeGas),
      getFullBridgeGasFromContract: jest.fn(getFullBridgeGas),
      getSingleBridgeTxGas: jest.fn(getSingleBridgeTxGas),
      getTxFees: jest.fn(),
      getDefiFees: jest.fn(),
      isFeePayingAsset: jest.fn((assetId: number) => assetId < 3),
      getUnadjustedBaseVerificationGas: jest.fn().mockReturnValue(BASE_GAS),
      getAdjustedBaseVerificationGas: jest.fn().mockReturnValue(BASE_GAS),
      getTxCallData: jest.fn(() => TX_CALL_DATA),
      getMaxTxCallData: jest.fn(),
      getMaxUnadjustedGas: jest.fn(),
    };
  });

  it("single tx that only covers it's own gas does not get returned", () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig.bridgeCallData, feeResolver as any);
    const rollupTx = createRollupTx(1, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    bridgeQ.addDefiTx(rollupTx);
    const txsForRollup = bridgeQ.getTxsToRollup(10, new Set(), 10, 100000, 1000);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.txsToRollup.length).toEqual(0);
    expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(0);
    expect(txsForRollup.resourcesConsumed.gasUsed).toBe(0);

    const unpublishedTxs = [rollupTx];
    testQueueStats(unpublishedTxs, bridgeQ);
  });

  it('single tx that covers the full bridge cost is returned', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig.bridgeCallData, feeResolver as any);
    const rollupTx = createRollupTx(
      1,
      TxType.DEFI_DEPOSIT,
      0,
      bridgeConfig.bridgeCallData,
      getAllOtherBridgeSlotsGas(),
    );
    bridgeQ.addDefiTx(rollupTx);
    const txsForRollup = bridgeQ.getTxsToRollup(10, new Set(), 10, 1000000, 1000);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.txsToRollup.length).toEqual(1);
    expect(txsForRollup.txsToRollup[0].tx.id).toEqual(1);
    expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(TX_CALL_DATA);
    // BASE_GAS is subtracted as we effectively remove an empty slot
    expect(txsForRollup.resourcesConsumed.gasUsed).toBe(TOTAL_DEFI_DEPOSIT_GAS - BASE_GAS + bridgeConfig.gas);

    const unpublishedTxs: RollupTx[] = [];
    testQueueStats(unpublishedTxs, bridgeQ);
  });

  it('multiple txs that cover the bridge cost are returned', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig.bridgeCallData, feeResolver as any);
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx3 = createRollupTx(3, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    bridgeQ.addDefiTx(rollupTx1);
    bridgeQ.addDefiTx(rollupTx2);
    bridgeQ.addDefiTx(rollupTx3);
    bridgeQ.addDefiTx(rollupTx4);
    bridgeQ.addDefiTx(rollupTx5);
    const numExpectedTxs = 5;
    const txsForRollup = bridgeQ.getTxsToRollup(10, new Set(), 10, 1000000, 1000);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.txsToRollup.length).toEqual(numExpectedTxs);
    expect(txsForRollup.txsToRollup.map(tx => tx.tx.id)).toEqual([1, 2, 3, 4, 5]);
    expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(TX_CALL_DATA * numExpectedTxs);
    expect(txsForRollup.resourcesConsumed.gasUsed).toBe(
      (TOTAL_DEFI_DEPOSIT_GAS - BASE_GAS) * numExpectedTxs + bridgeConfig.gas,
    );

    const unpublishedTxs: RollupTx[] = [];
    testQueueStats(unpublishedTxs, bridgeQ);
  });

  it('multiple txs are returned even with a single high fee tx', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig.bridgeCallData, feeResolver as any);
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx3 = createRollupTx(
      3,
      TxType.DEFI_DEPOSIT,
      0,
      bridgeConfig.bridgeCallData,
      getAllOtherBridgeSlotsGas(),
    );
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    bridgeQ.addDefiTx(rollupTx1);
    bridgeQ.addDefiTx(rollupTx2);
    bridgeQ.addDefiTx(rollupTx3);
    bridgeQ.addDefiTx(rollupTx4);
    bridgeQ.addDefiTx(rollupTx5);
    const numExpectedTxs = 5;
    const txsForRollup = bridgeQ.getTxsToRollup(10, new Set(), 10, 1000000, 1000);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.txsToRollup.length).toEqual(numExpectedTxs);
    expect(txsForRollup.txsToRollup.map(tx => tx.tx.id)).toEqual([3, 1, 2, 4, 5]);
    expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(TX_CALL_DATA * numExpectedTxs);
    expect(txsForRollup.resourcesConsumed.gasUsed).toBe(
      (TOTAL_DEFI_DEPOSIT_GAS - BASE_GAS) * numExpectedTxs + bridgeConfig.gas,
    );

    const unpublishedTxs: RollupTx[] = [];
    testQueueStats(unpublishedTxs, bridgeQ);
  });

  it('number of returned txs is limited to max slots', () => {
    {
      const bridgeQ = new BridgeTxQueue(bridgeConfig.bridgeCallData, feeResolver as any);
      const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
      const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
      const rollupTx3 = createRollupTx(
        3,
        TxType.DEFI_DEPOSIT,
        0,
        bridgeConfig.bridgeCallData,
        getAllOtherBridgeSlotsGas(),
      );
      const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 220000);
      const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 320000);
      bridgeQ.addDefiTx(rollupTx1);
      bridgeQ.addDefiTx(rollupTx2);
      bridgeQ.addDefiTx(rollupTx3);
      bridgeQ.addDefiTx(rollupTx4);
      bridgeQ.addDefiTx(rollupTx5);
      // only 3 slots remaining
      const expectedTxs = 3;
      const txsForRollup = bridgeQ.getTxsToRollup(3, new Set(), 10, 1000000, 1000);
      expect(txsForRollup).toBeTruthy();
      expect(txsForRollup.txsToRollup.length).toEqual(expectedTxs);
      expect(txsForRollup.txsToRollup.map(tx => tx.tx.id)).toEqual([3, 5, 4]);
      expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(TX_CALL_DATA * expectedTxs);
      expect(txsForRollup.resourcesConsumed.gasUsed).toBe(
        (TOTAL_DEFI_DEPOSIT_GAS - BASE_GAS) * expectedTxs + bridgeConfig.gas,
      );

      const unpublishedTxs = [rollupTx1, rollupTx2];
      testQueueStats(unpublishedTxs, bridgeQ);
    }
    {
      const bridgeQ = new BridgeTxQueue(bridgeConfig.bridgeCallData, feeResolver as any);
      const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
      const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
      const rollupTx3 = createRollupTx(
        3,
        TxType.DEFI_DEPOSIT,
        0,
        bridgeConfig.bridgeCallData,
        getAllOtherBridgeSlotsGas(),
      );
      const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 220000);
      const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 320000);
      bridgeQ.addDefiTx(rollupTx1);
      bridgeQ.addDefiTx(rollupTx2);
      bridgeQ.addDefiTx(rollupTx3);
      bridgeQ.addDefiTx(rollupTx4);
      bridgeQ.addDefiTx(rollupTx5);
      const expectedTxs = 4;
      // only 4 slots remaining
      const txsForRollup = bridgeQ.getTxsToRollup(4, new Set(), 10, 1000000, 1000);
      expect(txsForRollup).toBeTruthy();
      expect(txsForRollup.txsToRollup.length).toEqual(expectedTxs);
      expect(txsForRollup.txsToRollup.map(tx => tx.tx.id)).toEqual([3, 5, 4, 1]);
      expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(TX_CALL_DATA * expectedTxs);
      expect(txsForRollup.resourcesConsumed.gasUsed).toBe(
        (TOTAL_DEFI_DEPOSIT_GAS - BASE_GAS) * expectedTxs + bridgeConfig.gas,
      );

      const unpublishedTxs = [rollupTx2];
      testQueueStats(unpublishedTxs, bridgeQ);
    }
  });

  it('number of returned txs is limited to gas remaining', () => {
    {
      const bridgeQ = new BridgeTxQueue(bridgeConfig.bridgeCallData, feeResolver as any);
      const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
      const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
      const rollupTx3 = createRollupTx(
        3,
        TxType.DEFI_DEPOSIT,
        0,
        bridgeConfig.bridgeCallData,
        getAllOtherBridgeSlotsGas(),
      );
      const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 220000);
      const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 320000);
      bridgeQ.addDefiTx(rollupTx1);
      bridgeQ.addDefiTx(rollupTx2);
      bridgeQ.addDefiTx(rollupTx3);
      bridgeQ.addDefiTx(rollupTx4);
      bridgeQ.addDefiTx(rollupTx5);
      // 10 remaining slots but only 649999 remaining gas, this is enough for the bridge + 4 txs
      // this is because the bridge = 500000 gas. each tx is 30000 gas
      const expectedTxs = 4;
      const txsForRollup = bridgeQ.getTxsToRollup(10, new Set(), 10, 649999, 1000);
      expect(txsForRollup).toBeTruthy();
      expect(txsForRollup.txsToRollup.length).toEqual(expectedTxs);
      expect(txsForRollup.txsToRollup.map(tx => tx.tx.id)).toEqual([3, 5, 4, 1]);
      expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(TX_CALL_DATA * expectedTxs);
      expect(txsForRollup.resourcesConsumed.gasUsed).toBe(
        (TOTAL_DEFI_DEPOSIT_GAS - BASE_GAS) * expectedTxs + bridgeConfig.gas,
      );
      const unpublishedTxs = [rollupTx2];
      testQueueStats(unpublishedTxs, bridgeQ);
    }

    {
      const bridgeQ = new BridgeTxQueue(bridgeConfig.bridgeCallData, feeResolver as any);
      const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
      const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
      const rollupTx3 = createRollupTx(
        3,
        TxType.DEFI_DEPOSIT,
        0,
        bridgeConfig.bridgeCallData,
        getAllOtherBridgeSlotsGas(),
      );
      const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 220000);
      const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 320000);
      bridgeQ.addDefiTx(rollupTx1);
      bridgeQ.addDefiTx(rollupTx2);
      bridgeQ.addDefiTx(rollupTx3);
      bridgeQ.addDefiTx(rollupTx4);
      bridgeQ.addDefiTx(rollupTx5);
      // 10 remaining slots but only 619999 remaining gas, this is enough for the bridge + 3 txs
      const expectedTxs = 3;
      const txsForRollup = bridgeQ.getTxsToRollup(10, new Set(), 10, 619999, 1000);
      expect(txsForRollup).toBeTruthy();
      expect(txsForRollup.txsToRollup.length).toEqual(expectedTxs);
      expect(txsForRollup.txsToRollup.map(tx => tx.tx.id)).toEqual([3, 5, 4]);
      expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(TX_CALL_DATA * expectedTxs);
      expect(txsForRollup.resourcesConsumed.gasUsed).toBe(
        (TOTAL_DEFI_DEPOSIT_GAS - BASE_GAS) * expectedTxs + bridgeConfig.gas,
      );
      const unpublishedTxs = [rollupTx1, rollupTx2];
      testQueueStats(unpublishedTxs, bridgeQ);
    }
  });

  it('number of returned txs is limited to call data remaining', () => {
    {
      const bridgeQ = new BridgeTxQueue(bridgeConfig.bridgeCallData, feeResolver as any);
      const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
      const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
      const rollupTx3 = createRollupTx(
        3,
        TxType.DEFI_DEPOSIT,
        0,
        bridgeConfig.bridgeCallData,
        getAllOtherBridgeSlotsGas(),
      );
      const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 220000);
      const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 320000);
      bridgeQ.addDefiTx(rollupTx1);
      bridgeQ.addDefiTx(rollupTx2);
      bridgeQ.addDefiTx(rollupTx3);
      bridgeQ.addDefiTx(rollupTx4);
      bridgeQ.addDefiTx(rollupTx5);
      // 10 remaining slots but only 400 remaining call data, this is enough for 4 txs
      const expectedTxs = 4;
      const txsForRollup = bridgeQ.getTxsToRollup(10, new Set(), 10, 1000000, 400);
      expect(txsForRollup).toBeTruthy();
      expect(txsForRollup.txsToRollup.length).toEqual(expectedTxs);
      expect(txsForRollup.txsToRollup.map(tx => tx.tx.id)).toEqual([3, 5, 4, 1]);
      expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(TX_CALL_DATA * expectedTxs);
      expect(txsForRollup.resourcesConsumed.gasUsed).toBe(
        (TOTAL_DEFI_DEPOSIT_GAS - BASE_GAS) * expectedTxs + bridgeConfig.gas,
      );
      const unpublishedTxs = [rollupTx2];
      testQueueStats(unpublishedTxs, bridgeQ);
    }
    {
      const bridgeQ = new BridgeTxQueue(bridgeConfig.bridgeCallData, feeResolver as any);
      const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
      const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
      const rollupTx3 = createRollupTx(
        3,
        TxType.DEFI_DEPOSIT,
        0,
        bridgeConfig.bridgeCallData,
        getAllOtherBridgeSlotsGas(),
      );
      const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 220000);
      const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 320000);
      bridgeQ.addDefiTx(rollupTx1);
      bridgeQ.addDefiTx(rollupTx2);
      bridgeQ.addDefiTx(rollupTx3);
      bridgeQ.addDefiTx(rollupTx4);
      bridgeQ.addDefiTx(rollupTx5);
      // 10 remaining slots but only 399 remaining call data, this is enough for 3 txs
      const expectedTxs = 3;
      const txsForRollup = bridgeQ.getTxsToRollup(10, new Set(), 10, 1000000, 399);
      expect(txsForRollup).toBeTruthy();
      expect(txsForRollup.txsToRollup.length).toEqual(expectedTxs);
      expect(txsForRollup.txsToRollup.map(tx => tx.tx.id)).toEqual([3, 5, 4]);
      expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(TX_CALL_DATA * expectedTxs);
      expect(txsForRollup.resourcesConsumed.gasUsed).toBe(
        (TOTAL_DEFI_DEPOSIT_GAS - BASE_GAS) * expectedTxs + bridgeConfig.gas,
      );
      const unpublishedTxs = [rollupTx1, rollupTx2];
      testQueueStats(unpublishedTxs, bridgeQ);
    }
  });

  it('multiple txs are not returned if not enough slots', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig.bridgeCallData, feeResolver as any);
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx3 = createRollupTx(3, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    bridgeQ.addDefiTx(rollupTx1);
    bridgeQ.addDefiTx(rollupTx2);
    bridgeQ.addDefiTx(rollupTx3);
    bridgeQ.addDefiTx(rollupTx4);
    bridgeQ.addDefiTx(rollupTx5);
    // only 3 slots remaining, not enough for the brigde to be published
    const txsForRollup = bridgeQ.getTxsToRollup(3, new Set(), 10, 100000, 1000);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.txsToRollup.length).toEqual(0);
    expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(0);
    expect(txsForRollup.resourcesConsumed.gasUsed).toBe(0);
    const unpublishedTxs: RollupTx[] = [rollupTx1, rollupTx2, rollupTx3, rollupTx4, rollupTx5];
    testQueueStats(unpublishedTxs, bridgeQ);
  });

  it('multiple txs are not returned if not enough remaining gas for the bridge', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig.bridgeCallData, feeResolver as any);
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx3 = createRollupTx(3, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    bridgeQ.addDefiTx(rollupTx1);
    bridgeQ.addDefiTx(rollupTx2);
    bridgeQ.addDefiTx(rollupTx3);
    bridgeQ.addDefiTx(rollupTx4);
    bridgeQ.addDefiTx(rollupTx5);
    // 500000 gas required for the bridge, this only has 499999
    const txsForRollup = bridgeQ.getTxsToRollup(10, new Set(), 10, 499999, 1000);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.txsToRollup.length).toEqual(0);
    expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(0);
    expect(txsForRollup.resourcesConsumed.gasUsed).toBe(0);
    const unpublishedTxs: RollupTx[] = [rollupTx1, rollupTx2, rollupTx3, rollupTx4, rollupTx5];
    testQueueStats(unpublishedTxs, bridgeQ);
  });

  it('multiple txs are not returned if not enough remaining gas for the bridge and all txs required for it', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig.bridgeCallData, feeResolver as any);
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx3 = createRollupTx(3, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    bridgeQ.addDefiTx(rollupTx1);
    bridgeQ.addDefiTx(rollupTx2);
    bridgeQ.addDefiTx(rollupTx3);
    bridgeQ.addDefiTx(rollupTx4);
    bridgeQ.addDefiTx(rollupTx5);
    // 650000 gas required for the bridge and all txs, this only has 649999
    const txsForRollup = bridgeQ.getTxsToRollup(10, new Set(), 10, 649999, 1000);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.txsToRollup.length).toEqual(0);
    expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(0);
    expect(txsForRollup.resourcesConsumed.gasUsed).toBe(0);
    const unpublishedTxs: RollupTx[] = [rollupTx1, rollupTx2, rollupTx3, rollupTx4, rollupTx5];
    testQueueStats(unpublishedTxs, bridgeQ);
  });

  it('multiple txs are not returned if not enough remaining call data for all of the txs', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig.bridgeCallData, feeResolver as any);
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx3 = createRollupTx(3, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    bridgeQ.addDefiTx(rollupTx1);
    bridgeQ.addDefiTx(rollupTx2);
    bridgeQ.addDefiTx(rollupTx3);
    bridgeQ.addDefiTx(rollupTx4);
    bridgeQ.addDefiTx(rollupTx5);
    // 500 call data required, this only has 499
    const txsForRollup = bridgeQ.getTxsToRollup(10, new Set(), 10, 1000000, 499);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.txsToRollup.length).toEqual(0);
    expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(0);
    expect(txsForRollup.resourcesConsumed.gasUsed).toBe(0);
    const unpublishedTxs: RollupTx[] = [rollupTx1, rollupTx2, rollupTx3, rollupTx4, rollupTx5];
    testQueueStats(unpublishedTxs, bridgeQ);
  });

  it('multiple txs are not limited to bridge size', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig.bridgeCallData, feeResolver as any);
    // bridge size here is 5
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx3 = createRollupTx(3, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx6 = createRollupTx(6, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx7 = createRollupTx(7, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx8 = createRollupTx(8, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    bridgeQ.addDefiTx(rollupTx1);
    bridgeQ.addDefiTx(rollupTx2);
    bridgeQ.addDefiTx(rollupTx3);
    bridgeQ.addDefiTx(rollupTx4);
    bridgeQ.addDefiTx(rollupTx5);
    bridgeQ.addDefiTx(rollupTx6);
    bridgeQ.addDefiTx(rollupTx7);
    bridgeQ.addDefiTx(rollupTx8);
    const numExpectedTxs = 8;
    const txsForRollup = bridgeQ.getTxsToRollup(10, new Set(), 10, 1000000, 1000);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.txsToRollup.length).toEqual(numExpectedTxs);
    expect(txsForRollup.txsToRollup.map(tx => tx.tx.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(TX_CALL_DATA * numExpectedTxs);
    expect(txsForRollup.resourcesConsumed.gasUsed).toBe(
      (TOTAL_DEFI_DEPOSIT_GAS - BASE_GAS) * numExpectedTxs + bridgeConfig.gas,
    );
    const unpublishedTxs: RollupTx[] = [];
    testQueueStats(unpublishedTxs, bridgeQ);
  });

  it('multiple txs are not limited to single bridge size', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig.bridgeCallData, feeResolver as any);
    // bridge size is 5
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx3 = createRollupTx(3, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx6 = createRollupTx(6, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx7 = createRollupTx(7, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx8 = createRollupTx(8, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx9 = createRollupTx(9, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx10 = createRollupTx(10, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
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
    const numExpectedTxs = 10;
    const txsForRollup = bridgeQ.getTxsToRollup(10, new Set(), 10, 1000000, 1000);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.txsToRollup.length).toEqual(numExpectedTxs);
    expect(txsForRollup.txsToRollup.map(tx => tx.tx.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(TX_CALL_DATA * numExpectedTxs);
    expect(txsForRollup.resourcesConsumed.gasUsed).toBe(
      (TOTAL_DEFI_DEPOSIT_GAS - BASE_GAS) * numExpectedTxs + bridgeConfig.gas,
    );
    const unpublishedTxs: RollupTx[] = [];
    testQueueStats(unpublishedTxs, bridgeQ);
  });

  it('txs that cover full bridge cost are ordered by excess gas at front of queue', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig.bridgeCallData, feeResolver as any);
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 120000);
    const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 130000);
    const rollupTx3 = createRollupTx(3, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 120000);
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 130000);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 120000);
    const rollupTx6 = createRollupTx(6, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 140000);
    const rollupTx7 = createRollupTx(7, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 120000);
    const rollupTx8 = createRollupTx(8, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 120000);
    bridgeQ.addDefiTx(rollupTx1);
    bridgeQ.addDefiTx(rollupTx2);
    bridgeQ.addDefiTx(rollupTx3);
    bridgeQ.addDefiTx(rollupTx4);
    bridgeQ.addDefiTx(rollupTx5);
    bridgeQ.addDefiTx(rollupTx6);
    bridgeQ.addDefiTx(rollupTx7);
    bridgeQ.addDefiTx(rollupTx8);
    const numExpectedTxs = 8;
    const txsForRollup = bridgeQ.getTxsToRollup(10, new Set(), 10, 1000000, 1000);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.txsToRollup.length).toEqual(numExpectedTxs);
    expect(txsForRollup.txsToRollup.map(tx => tx.tx.id)).toEqual([6, 2, 4, 1, 3, 5, 7, 8]);
    expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(TX_CALL_DATA * numExpectedTxs);
    expect(txsForRollup.resourcesConsumed.gasUsed).toBe(
      (TOTAL_DEFI_DEPOSIT_GAS - BASE_GAS) * numExpectedTxs + bridgeConfig.gas,
    );
    const unpublishedTxs: RollupTx[] = [];
    testQueueStats(unpublishedTxs, bridgeQ);
  });

  it('queue is depleted with each call', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig.bridgeCallData, feeResolver as any);
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx3 = createRollupTx(3, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx6 = createRollupTx(6, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx7 = createRollupTx(7, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx8 = createRollupTx(8, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx9 = createRollupTx(9, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx10 = createRollupTx(10, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
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
    let txsForRollup = bridgeQ.getTxsToRollup(5, new Set(), 10, 1000000, 1000);
    const numExpectedTxs = 5;
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.txsToRollup.length).toEqual(numExpectedTxs);
    expect(txsForRollup.txsToRollup.map(tx => tx.tx.id)).toEqual([1, 2, 3, 4, 5]);
    expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(TX_CALL_DATA * numExpectedTxs);
    expect(txsForRollup.resourcesConsumed.gasUsed).toBe(
      (TOTAL_DEFI_DEPOSIT_GAS - BASE_GAS) * numExpectedTxs + bridgeConfig.gas,
    );
    const unpublishedTxs = [rollupTx6, rollupTx7, rollupTx8, rollupTx9, rollupTx10];
    testQueueStats(unpublishedTxs, bridgeQ);

    txsForRollup = bridgeQ.getTxsToRollup(8, new Set(), 10, 1000000, 1000);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.txsToRollup.length).toEqual(numExpectedTxs);
    expect(txsForRollup.txsToRollup.map(tx => tx.tx.id)).toEqual([6, 7, 8, 9, 10]);
    expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(TX_CALL_DATA * numExpectedTxs);
    expect(txsForRollup.resourcesConsumed.gasUsed).toBe(
      (TOTAL_DEFI_DEPOSIT_GAS - BASE_GAS) * numExpectedTxs + bridgeConfig.gas,
    );

    const newUnpublishedTxs: RollupTx[] = [];
    testQueueStats(newUnpublishedTxs, bridgeQ);

    txsForRollup = bridgeQ.getTxsToRollup(8, new Set(), 10, 1000000, 1000);
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.txsToRollup.length).toEqual(0);
    expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(0);
    expect(txsForRollup.resourcesConsumed.gasUsed).toBe(0);
  });

  it('multiple txs are limited by number of assets', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig.bridgeCallData, feeResolver as any);
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx2 = createRollupTx(2, TxType.DEFI_DEPOSIT, 1, bridgeConfig.bridgeCallData, 0);
    const rollupTx3 = createRollupTx(3, TxType.DEFI_DEPOSIT, 1, bridgeConfig.bridgeCallData, 1200000);
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, 2, bridgeConfig.bridgeCallData, 0);
    bridgeQ.addDefiTx(rollupTx1);
    bridgeQ.addDefiTx(rollupTx2);
    bridgeQ.addDefiTx(rollupTx3);
    bridgeQ.addDefiTx(rollupTx4);
    bridgeQ.addDefiTx(rollupTx5);
    const assets = new Set<number>();
    const txsForRollup = bridgeQ.getTxsToRollup(10, assets, 1, 1000000, 1000);
    const numExpectedTxs = 2;
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.txsToRollup.length).toEqual(numExpectedTxs);
    expect(txsForRollup.txsToRollup.map(tx => tx.tx.id)).toEqual([3, 2]);
    expect(assets.size).toEqual(0);
    expect(txsForRollup.resourcesConsumed.assetIds.size).toBe(1);
    expect(txsForRollup.resourcesConsumed.assetIds.has(1)).toBe(true);
    expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(TX_CALL_DATA * numExpectedTxs);
    expect(txsForRollup.resourcesConsumed.gasUsed).toBe(
      (TOTAL_DEFI_DEPOSIT_GAS - BASE_GAS) * numExpectedTxs + bridgeConfig.gas,
    );
    const unpublishedTxs = [rollupTx1, rollupTx4, rollupTx5];
    testQueueStats(unpublishedTxs, bridgeQ);
  });

  it('only fee-paying assets count towards the asset limit', () => {
    const bridgeQ = new BridgeTxQueue(bridgeConfig.bridgeCallData, feeResolver as any);
    const rollupTx1 = createRollupTx(1, TxType.DEFI_DEPOSIT, 1, bridgeConfig.bridgeCallData, 0);
    const rollupTx2 = createRollupTx(
      2,
      TxType.DEFI_DEPOSIT,
      NON_FEE_PAYING_ASSET,
      bridgeConfig.bridgeCallData,
      1200000,
    );
    const rollupTx3 = createRollupTx(3, TxType.DEFI_DEPOSIT, 1, bridgeConfig.bridgeCallData, 1200000);
    const rollupTx4 = createRollupTx(4, TxType.DEFI_DEPOSIT, 0, bridgeConfig.bridgeCallData, 0);
    const rollupTx5 = createRollupTx(5, TxType.DEFI_DEPOSIT, 2, bridgeConfig.bridgeCallData, 0);
    bridgeQ.addDefiTx(rollupTx1);
    bridgeQ.addDefiTx(rollupTx2);
    bridgeQ.addDefiTx(rollupTx3);
    bridgeQ.addDefiTx(rollupTx4);
    bridgeQ.addDefiTx(rollupTx5);
    const assets = new Set<number>();
    const txsForRollup = bridgeQ.getTxsToRollup(10, assets, 1, 1000000, 1000);
    const numExpectedTxs = 3;
    expect(txsForRollup).toBeTruthy();
    expect(txsForRollup.txsToRollup.length).toEqual(numExpectedTxs);
    expect(txsForRollup.txsToRollup.map(tx => tx.tx.id)).toEqual([2, 3, 1]);
    expect(assets.size).toEqual(0);
    expect(txsForRollup.resourcesConsumed.assetIds.size).toBe(1);
    expect(txsForRollup.resourcesConsumed.assetIds.has(1)).toBe(true);
    expect(txsForRollup.resourcesConsumed.callDataUsed).toBe(TX_CALL_DATA * numExpectedTxs);
    expect(txsForRollup.resourcesConsumed.gasUsed).toBe(
      (TOTAL_DEFI_DEPOSIT_GAS - BASE_GAS) * numExpectedTxs + bridgeConfig.gas,
    );
    const unpublishedTxs = [rollupTx4, rollupTx5];
    testQueueStats(unpublishedTxs, bridgeQ);
  });
});

import { TxFeeResolver } from './tx_fee_resolver';
import { AssetId } from 'barretenberg/asset';
import { TxType } from 'barretenberg/blockchain';

describe('tx fee resolver', () => {
  const blockchain = {
    getBlockchainStatus: jest.fn().mockResolvedValue({
      assets: [
        {
          gasConstants: [5000, 0, 5000, 30000],
        },
      ],
    }),
  };
  const baseTxGas = 1000;
  const feeGasPrice = 1n;
  const txsPerRollup = 10;
  const publishInterval = 100;

  const txFeeResolver = new TxFeeResolver(blockchain as any, baseTxGas, feeGasPrice, txsPerRollup, publishInterval);

  beforeAll(async () => {
    await txFeeResolver.init();
  });

  it('should compute correct surplus in 0 edge case', async () => {
    const txFeeResolver = new TxFeeResolver(blockchain as any, baseTxGas, 0n, txsPerRollup, publishInterval);
    await txFeeResolver.init();
    const txs = [
      {
        assetId: AssetId.ETH,
        fee: 1000n * 5n,
        txType: TxType.TRANSFER,
      },
    ];
    const ratio = txFeeResolver.computeSurplusRatio(txs);
    expect(ratio).toEqual(1);
  });

  it('should compute correct surplus ratio for a "fast" tx', () => {
    const txs = [
      {
        assetId: AssetId.ETH,
        fee: 1000n * 5n,
        txType: TxType.TRANSFER,
      },
    ];
    const ratio = txFeeResolver.computeSurplusRatio(txs);
    expect(ratio).toEqual(0.6);
  });

  it('should compute correct surplus ratio for an instant tx', () => {
    const txs = [
      {
        assetId: AssetId.ETH,
        fee: 1000n * 11n + 5000n,
        txType: TxType.DEPOSIT,
      },
    ];
    const ratio = txFeeResolver.computeSurplusRatio(txs);
    expect(ratio).toEqual(0);
  });

  it('should compute correct surplus ratio for an full rollup', () => {
    const txs = new Array(10).fill({
      assetId: AssetId.ETH,
      fee: 1000n,
      txType: TxType.TRANSFER,
    });
    const ratio = txFeeResolver.computeSurplusRatio(txs);
    expect(ratio).toEqual(1);
  });

  it('should compute correct surplus ratio for an full rollup of "Average" txs', () => {
    const txs = new Array(10).fill({
      assetId: AssetId.ETH,
      fee: 1000n * 2n,
      txType: TxType.TRANSFER,
    });
    const ratio = txFeeResolver.computeSurplusRatio(txs);
    expect(ratio).toEqual(0);
  });

  it('The ratio should never be negative', () => {
    const txs = [
      {
        assetId: AssetId.ETH,
        fee: 1000n * 15n + 5000n,
        txType: TxType.DEPOSIT,
      },
    ];
    const ratio = txFeeResolver.computeSurplusRatio(txs);
    expect(ratio).toEqual(0);
  });

  it('should compute correct surplus ratio for no surplus', () => {
    const txs = [
      {
        assetId: AssetId.ETH,
        fee: 1000n,
        txType: TxType.TRANSFER,
      },
      {
        assetId: AssetId.ETH,
        fee: 1000n,
        txType: TxType.TRANSFER,
      },
      {
        assetId: AssetId.ETH,
        fee: 1000n + 30000n,
        txType: TxType.WITHDRAW_TO_CONTRACT,
      },
      {
        assetId: AssetId.ETH,
        fee: 1000n + 5000n,
        txType: TxType.DEPOSIT,
      },
    ];
    const ratio = txFeeResolver.computeSurplusRatio(txs);
    expect(ratio).toEqual(1);
  });

  it('should never return a ratio > 1 ', () => {
    const txs = [
      {
        assetId: AssetId.ETH,
        fee: 1000n,
        txType: TxType.TRANSFER,
      },
      {
        assetId: AssetId.ETH,
        fee: 1000n,
        txType: TxType.TRANSFER,
      },
      {
        assetId: AssetId.ETH,
        fee: 1000n,
        txType: TxType.WITHDRAW_TO_CONTRACT,
      },
      {
        assetId: AssetId.ETH,
        fee: 1000n,
        txType: TxType.DEPOSIT,
      },
    ];
    const ratio = txFeeResolver.computeSurplusRatio(txs);
    expect(ratio).toEqual(1);
  });
});

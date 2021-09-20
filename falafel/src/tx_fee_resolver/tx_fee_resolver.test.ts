import { AssetId } from '@aztec/barretenberg/asset';
import { Blockchain, PriceFeed, TxType } from '@aztec/barretenberg/blockchain';
import { SettlementTime } from '@aztec/barretenberg/rollup_provider';
import { EthPriceFeed } from '@aztec/blockchain';
import { TxFeeResolver } from '.';
import { RollupDb } from '../rollup_db';
import { mockTx } from './fixtures';

jest.useFakeTimers();

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

describe('tx fee resolver', () => {
  const baseTxGas = 16000;
  const maxFeeGasPrice = 250000000000n;
  const feeGasPriceMultiplier = 2.5;
  const txsPerRollup = 10;
  const publishInterval = 3600;
  const surplusRatios = [1, 0.9, 0.5, 0];
  const feeFreeAssets: AssetId[] = [];
  let dateSpy: jest.SpyInstance<number>;
  let gasPriceFeed: Mockify<PriceFeed>;
  let tokenPriceFeed: Mockify<PriceFeed>;
  let blockchain: Mockify<Blockchain>;
  let rollupDb: Mockify<RollupDb>;
  let txFeeResolver!: TxFeeResolver;

  beforeEach(() => {
    dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => 1618226064000);

    gasPriceFeed = {
      latestRound: jest.fn().mockResolvedValue(1n),
      price: jest.fn().mockResolvedValue(50000000000n),
      getRoundData: jest.fn().mockResolvedValue({
        roundId: 1n,
        price: 50000000000n,
        timestamp: Math.floor(Date.now() / 1000),
      }),
    } as any;

    tokenPriceFeed = {
      latestRound: jest.fn().mockResolvedValue(1n),
      price: jest.fn().mockResolvedValue(10n * 10n ** 18n),
      getRoundData: jest.fn().mockResolvedValue({
        roundId: 1n,
        price: 10n * 10n ** 18n,
        timestamp: Math.floor(Date.now() / 1000),
      }),
    } as any;

    blockchain = {
      getBlockchainStatus: jest.fn().mockResolvedValue({
        assets: [
          {
            decimals: 18,
            gasConstants: [5000, 0, 3000, 30000, 0, 36000, 20000],
          },
          {
            decimals: 8,
            gasConstants: [5000, 0, 3600, 36000, 0, 0, 0],
          },
        ],
      }),
      getGasPriceFeed: jest.fn().mockReturnValue(gasPriceFeed),
      getPriceFeed: jest.fn().mockImplementation((assetId: AssetId) => {
        if (assetId === AssetId.ETH) {
          return new EthPriceFeed();
        }
        return tokenPriceFeed;
      }),
    } as any;

    rollupDb = {
      getRollups: jest.fn().mockResolvedValue([]),
    } as any;

    txFeeResolver = new TxFeeResolver(
      blockchain,
      rollupDb,
      baseTxGas,
      maxFeeGasPrice,
      feeGasPriceMultiplier,
      txsPerRollup,
      publishInterval,
      surplusRatios,
      feeFreeAssets,
    );
  });

  afterEach(() => {
    dateSpy.mockRestore();
  });

  it('return correct fee quotes', async () => {
    expect(txFeeResolver.getFeeQuotes(AssetId.ETH)).toEqual({ feeConstants: [], baseFeeQuotes: [] });
    expect(txFeeResolver.getFeeQuotes(AssetId.DAI)).toEqual({ feeConstants: [], baseFeeQuotes: [] });
    await txFeeResolver.start();
    expect(txFeeResolver.getFeeQuotes(AssetId.ETH)).toEqual({
      feeConstants: [
        625000000000000n,
        0n,
        375000000000000n,
        3750000000000000n,
        0n,
        4500000000000000n,
        2500000000000000n,
      ],
      baseFeeQuotes: [
        {
          fee: 2000000000000000n,
          time: 3600,
        },
        {
          fee: 4000000000000000n,
          time: 3600 * 0.9,
        },
        {
          fee: 12000000000000000n,
          time: 3600 * 0.5,
        },
        {
          fee: 22000000000000000n,
          time: 5 * 60,
        },
      ],
    });
    expect(txFeeResolver.getFeeQuotes(AssetId.DAI)).toEqual({
      feeConstants: [6250n, 0n, 4500n, 45000n, 0n, 0n, 0n],
      baseFeeQuotes: [
        {
          fee: 20000n,
          time: 3600,
        },
        {
          fee: 40000n,
          time: 3600 * 0.9,
        },
        {
          fee: 120000n,
          time: 3600 * 0.5,
        },
        {
          fee: 220000n,
          time: 5 * 60,
        },
      ],
    });
  });

  it('return correct min fees', async () => {
    expect(txFeeResolver.getMinTxFee(AssetId.ETH, TxType.DEPOSIT)).toBe(0n);
    expect(txFeeResolver.getMinTxFee(AssetId.DAI, TxType.DEPOSIT)).toBe(0n);
    await txFeeResolver.start();
    expect(txFeeResolver.getMinTxFee(AssetId.ETH, TxType.DEPOSIT)).toBe(2000000000000000n + 625000000000000n);
    expect(txFeeResolver.getMinTxFee(AssetId.DAI, TxType.DEPOSIT)).toBe(20000n + 6250n);
  });

  it('return correct surplus ratio', async () => {
    await txFeeResolver.start();
    const minEthFee = txFeeResolver.getMinTxFee(AssetId.ETH, TxType.DEPOSIT);
    const baseEthFee = txFeeResolver.getFeeQuotes(AssetId.ETH).baseFeeQuotes[SettlementTime.SLOW].fee;
    const minFee = txFeeResolver.getMinTxFee(AssetId.DAI, TxType.DEPOSIT);
    const baseFee = txFeeResolver.getFeeQuotes(AssetId.DAI).baseFeeQuotes[SettlementTime.SLOW].fee;
    const txs = [
      mockTx(AssetId.DAI, TxType.DEPOSIT, minFee + baseFee * 2n),
      mockTx(AssetId.ETH, TxType.DEPOSIT, minEthFee + baseEthFee * 5n),
      mockTx(AssetId.DAI, TxType.DEPOSIT, minFee - baseFee),
    ];
    expect(txFeeResolver.computeSurplusRatio(txs)).toBe(0.4);
  });
});

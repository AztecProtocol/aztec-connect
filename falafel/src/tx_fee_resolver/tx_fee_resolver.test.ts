import { AssetId } from 'barretenberg/asset';
import { Blockchain, PriceFeed, TxType } from 'barretenberg/blockchain';
import { SettlementTime } from 'barretenberg/rollup_provider';
import { EthPriceFeed } from 'blockchain';
import { TxFeeResolver } from './index';
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
  const freeTxTypes: TxType[] = [];
  const numSignificantFigures = 0;
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
            gasConstants: [5000, 0, 3000, 30000, 0],
          },
          {
            decimals: 8,
            gasConstants: [5000, 0, 3600, 36000, 0],
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
      freeTxTypes,
      numSignificantFigures,
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
      feeConstants: [2625000000000000n, 2000000000000000n, 2375000000000000n, 5750000000000000n, 2000000000000000n],
      baseFeeQuotes: [
        {
          fee: 0n,
          time: 3600,
        },
        {
          fee: 2000000000000000n,
          time: 3600 * 0.9,
        },
        {
          fee: 10000000000000000n,
          time: 3600 * 0.5,
        },
        {
          fee: 20000000000000000n,
          time: 5 * 60,
        },
      ],
    });
    expect(txFeeResolver.getFeeQuotes(AssetId.DAI)).toEqual({
      feeConstants: [26250n, 20000n, 24500n, 65000n, 20000n],
      baseFeeQuotes: [
        {
          fee: 0n,
          time: 3600,
        },
        {
          fee: 20000n,
          time: 3600 * 0.9,
        },
        {
          fee: 100000n,
          time: 3600 * 0.5,
        },
        {
          fee: 200000n,
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
    const ethQuotes = txFeeResolver.getFeeQuotes(AssetId.ETH);
    const daiQuotes = txFeeResolver.getFeeQuotes(AssetId.DAI);
    const txs = [
      mockTx(
        AssetId.DAI,
        TxType.DEPOSIT,
        daiQuotes.feeConstants[TxType.DEPOSIT] + daiQuotes.baseFeeQuotes[SettlementTime.SLOW].fee,
      ),
      mockTx(
        AssetId.ETH,
        TxType.DEPOSIT,
        ethQuotes.feeConstants[TxType.DEPOSIT] + ethQuotes.baseFeeQuotes[SettlementTime.AVERAGE].fee,
      ),
      mockTx(
        AssetId.DAI,
        TxType.DEPOSIT,
        daiQuotes.feeConstants[TxType.DEPOSIT] + daiQuotes.baseFeeQuotes[SettlementTime.FAST].fee,
      ),
    ];
    expect(txFeeResolver.computeSurplusRatio(txs)).toBe(0.4);
  });
});

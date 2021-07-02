import { TxFeeResolver } from './tx_fee_resolver';
import { AssetId } from 'barretenberg/asset';
import { Blockchain, PriceFeed, TxType } from 'barretenberg/blockchain';
import { TxDao } from './entity/tx';
import { RollupDb } from './rollup_db';
import { SettlementTime } from 'barretenberg/rollup_provider';
import { RollupDao } from './entity/rollup';
import { EthPriceFeed } from 'blockchain';

jest.useFakeTimers();

interface MinimalTxDao {
  assetId: AssetId;
  fee: bigint;
  txType: TxType;
}

interface MinimalRollupDao {
  id: number;
  created: Date;
}

const toTxDao = (tx: MinimalTxDao) => (tx as unknown) as TxDao;
const toTxDaos = (txs: MinimalTxDao[]) => txs.map(toTxDao);

const toRollupDao = (rollup: MinimalRollupDao) => (rollup as unknown) as RollupDao;
const toRollupDaos = (rollups: MinimalRollupDao[]) => rollups.map(toRollupDao);

describe('tx fee resolver', () => {
  const baseTxGas = 1000;
  const maxFeeGasPrice = 0n;
  const feeGasPriceMultiplier = 1;
  const txsPerRollup = 10;
  const publishInterval = 100;
  const surplusRatios = [1, 0.9, 0.5, 0];
  const feeFreeAssets: AssetId[] = [];
  let dateSpy: jest.SpyInstance<number>;
  let mockGasPriceFeed: PriceFeed;
  let mockTokenPriceFeed: PriceFeed;
  let blockchain: Blockchain;
  let rollupDb: RollupDb;
  let txFeeResolver!: TxFeeResolver;

  beforeEach(() => {
    dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => 1618226064000);

    mockGasPriceFeed = ({
      latestRound: () => 10n,
      price: () => 1n,
      getRoundData: (roundId: bigint) => ({
        roundId,
        price: 1n,
        timestamp: Math.floor(Date.now() / 1000),
      }),
    } as any) as PriceFeed;

    mockTokenPriceFeed = ({
      latestRound: () => 10n,
      getRoundData: (roundId: bigint) => ({
        roundId,
        price: 20n,
        timestamp: Math.floor(Date.now() / 1000),
      }),
    } as any) as PriceFeed;

    blockchain = ({
      getBlockchainStatus: jest.fn().mockResolvedValue({
        assets: [
          {
            decimals: 18,
            gasConstants: [5000, 0, 8000, 30000],
          },
          {
            decimals: 0,
            gasConstants: [25000, 1000, 50000, 75000],
          },
        ],
      }),
      getAssetPrice: (assetId: AssetId) => {
        if (assetId === AssetId.ETH) {
          return 10n ** 18n;
        }
        return 1n;
      },
      getGasPriceFeed: () => mockGasPriceFeed,
      getPriceFeed: (assetId: AssetId) => {
        if (assetId === AssetId.ETH) {
          return new EthPriceFeed();
        }
        return mockTokenPriceFeed;
      },
    } as any) as Blockchain;

    rollupDb = ({
      getRollups: jest.fn().mockResolvedValue([]),
      getUnsettledTxCount: jest.fn().mockResolvedValue(0),
    } as any) as RollupDb;

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

  describe('start running', () => {
    beforeEach(() => {
      jest.spyOn(mockGasPriceFeed, 'getRoundData').mockImplementation(async (roundId: bigint) => ({
        roundId,
        price: roundId * 10n,
        timestamp: Math.floor(Date.now() / 1000) - (10 - Number(roundId)),
      }));
      jest.spyOn(mockTokenPriceFeed, 'getRoundData').mockImplementation(async (roundId: bigint) => ({
        roundId,
        price: roundId,
        timestamp: Math.floor(Date.now() / 1000) - (10 - Number(roundId)),
      }));
      jest.spyOn(blockchain, 'getPriceFeed').mockImplementation((assetId: AssetId) => {
        if (assetId === AssetId.ETH) {
          return new EthPriceFeed();
        }
        return mockTokenPriceFeed;
      });
    });

    it('restore prices from before the created time of latest rollup', async () => {
      jest.spyOn(rollupDb, 'getRollups').mockImplementation(async () =>
        toRollupDaos([
          {
            id: 1,
            created: new Date(Date.now() - 4000),
          },
        ]),
      );
      await txFeeResolver.start();
      expect((txFeeResolver as any).rollupPrices).toEqual([
        {
          rollupId: 2,
          gasPrice: 60n,
          assetPrices: [10n ** 18n, 6n],
        },
      ]);
    });

    it('restore from latest prices if there is no previous rollup', async () => {
      await txFeeResolver.start();
      expect((txFeeResolver as any).rollupPrices).toEqual([
        {
          rollupId: 0,
          gasPrice: 100n,
          assetPrices: [10n ** 18n, 10n],
        },
      ]);
    });

    it('should start recording rollup prices', async () => {
      const restorePrices = jest.spyOn(txFeeResolver as any, 'restorePrices').mockImplementation(jest.fn());
      let resolveRecordRollupPrices: () => void;
      const recordRollupPricesPromise = new Promise<void>(resolve => (resolveRecordRollupPrices = resolve));
      const recordRollupPrices = jest.spyOn(txFeeResolver as any, 'recordRollupPrices').mockImplementation(async () => {
        // restorePrices() should have been called before recordRollupPrices().
        expect(restorePrices).toHaveBeenCalledTimes(1);
        resolveRecordRollupPrices();
      });
      await txFeeResolver.start();
      await recordRollupPricesPromise;
      expect(recordRollupPrices).toHaveBeenCalledTimes(1);
    });
  });

  describe('tx fee and fee quotes', () => {
    const startNewResolver = async (txFeeResolver: TxFeeResolver) => {
      jest.spyOn(txFeeResolver as any, 'recordRollupPrices').mockImplementation(jest.fn());
      await txFeeResolver.start();
      return txFeeResolver;
    };

    beforeEach(() => {
      jest.spyOn(mockTokenPriceFeed, 'getRoundData').mockImplementation(async (roundId: bigint) => ({
        roundId,
        price: 2n,
        timestamp: Math.floor(Date.now() / 1000) - (10 - Number(roundId)),
      }));
      jest.spyOn(mockGasPriceFeed, 'getRoundData').mockImplementation(async (roundId: bigint) => ({
        roundId,
        price: 10n,
        timestamp: Math.floor(Date.now() / 1000),
      }));
    });

    it('return correct tx fee and fee quotes', async () => {
      const txsPerRollup = 32;
      const publishInterval = 60 * 60;
      const txFeeResolver = await startNewResolver(
        new TxFeeResolver(
          blockchain,
          rollupDb,
          baseTxGas,
          maxFeeGasPrice,
          feeGasPriceMultiplier,
          txsPerRollup,
          publishInterval,
          surplusRatios,
          feeFreeAssets,
        ),
      );

      {
        const assetId = AssetId.ETH;
        expect(txFeeResolver.getFeeQuotes(assetId)).toEqual({
          feeConstants: [50000n, 0n, 80000n, 300000n],
          baseFeeQuotes: [
            {
              fee: 10000n,
              time: publishInterval,
            },
            {
              fee: 10000n * 4n,
              time: publishInterval * 0.9,
            },
            {
              fee: 10000n * 17n,
              time: publishInterval * 0.5,
            },
            {
              fee: 10000n * 33n,
              time: 5 * 60,
            },
          ],
        });

        const baseFee = 10000n;
        expect(txFeeResolver.getMinTxFee(assetId, TxType.DEPOSIT)).toBe(50000n + baseFee);
        expect(txFeeResolver.getMinTxFee(assetId, TxType.TRANSFER)).toBe(0n + baseFee);
        expect(txFeeResolver.getMinTxFee(assetId, TxType.WITHDRAW_TO_WALLET)).toBe(80000n + baseFee);
        expect(txFeeResolver.getMinTxFee(assetId, TxType.WITHDRAW_TO_CONTRACT)).toBe(300000n + baseFee);
        expect(txFeeResolver.getTxFee(assetId, TxType.DEPOSIT, SettlementTime.SLOW)).toBe(50000n + baseFee);
        expect(txFeeResolver.getTxFee(assetId, TxType.DEPOSIT, SettlementTime.AVERAGE)).toBe(50000n + baseFee * 4n);
        expect(txFeeResolver.getTxFee(assetId, TxType.DEPOSIT, SettlementTime.FAST)).toBe(50000n + baseFee * 17n);
        expect(txFeeResolver.getTxFee(assetId, TxType.DEPOSIT, SettlementTime.INSTANT)).toBe(50000n + baseFee * 33n);
      }

      {
        const assetId = AssetId.DAI;
        expect(txFeeResolver.getFeeQuotes(assetId)).toEqual({
          feeConstants: [25000n * 5n, 1000n * 5n, 50000n * 5n, 75000n * 5n], // * feeGasPrice / assetPrice
          baseFeeQuotes: [
            {
              fee: 1000n * 5n,
              time: publishInterval,
            },
            {
              fee: 1000n * 5n * 4n,
              time: publishInterval * 0.9,
            },
            {
              fee: 1000n * 5n * 17n,
              time: publishInterval * 0.5,
            },
            {
              fee: 1000n * 5n * 33n,
              time: 5 * 60,
            },
          ],
        });

        const baseFee = 1000n * 5n;
        expect(txFeeResolver.getMinTxFee(assetId, TxType.DEPOSIT)).toBe(25000n * 5n + baseFee);
        expect(txFeeResolver.getMinTxFee(assetId, TxType.TRANSFER)).toBe(1000n * 5n + baseFee);
        expect(txFeeResolver.getMinTxFee(assetId, TxType.WITHDRAW_TO_WALLET)).toBe(50000n * 5n + baseFee);
        expect(txFeeResolver.getMinTxFee(assetId, TxType.WITHDRAW_TO_CONTRACT)).toBe(75000n * 5n + baseFee);
        expect(txFeeResolver.getTxFee(assetId, TxType.TRANSFER, SettlementTime.SLOW)).toBe(5000n + baseFee);
        expect(txFeeResolver.getTxFee(assetId, TxType.TRANSFER, SettlementTime.AVERAGE)).toBe(5000n + baseFee * 4n);
        expect(txFeeResolver.getTxFee(assetId, TxType.TRANSFER, SettlementTime.FAST)).toBe(5000n + baseFee * 17n);
        expect(txFeeResolver.getTxFee(assetId, TxType.TRANSFER, SettlementTime.INSTANT)).toBe(5000n + baseFee * 33n);
      }
    });

    it('return correct tx fee and fee quotes with fee multiplier', async () => {
      const feeGasPriceMultiplier = 1.2;
      const txFeeResolver = await startNewResolver(
        new TxFeeResolver(
          blockchain,
          rollupDb,
          baseTxGas,
          maxFeeGasPrice,
          feeGasPriceMultiplier,
          txsPerRollup,
          publishInterval,
          surplusRatios,
          feeFreeAssets,
        ),
      );
      const withMultiplier = (value: bigint) => (value * BigInt(feeGasPriceMultiplier * 100)) / 100n;

      {
        const assetId = AssetId.ETH;
        expect(txFeeResolver.getFeeQuotes(assetId)).toEqual({
          feeConstants: [50000n, 0n, 80000n, 300000n].map(withMultiplier),
          baseFeeQuotes: [
            expect.objectContaining({ fee: withMultiplier(10000n) }),
            expect.objectContaining({ fee: withMultiplier(10000n * 2n) }),
            expect.objectContaining({ fee: withMultiplier(10000n * 6n) }),
            expect.objectContaining({ fee: withMultiplier(10000n * 11n) }),
          ],
        });

        expect(txFeeResolver.getMinTxFee(assetId, TxType.DEPOSIT)).toBe(72000n);
        expect(txFeeResolver.getTxFee(assetId, TxType.WITHDRAW_TO_WALLET, SettlementTime.FAST)).toBe(168000n);
      }

      {
        const assetId = AssetId.DAI;
        expect(txFeeResolver.getFeeQuotes(assetId)).toEqual({
          feeConstants: [25000n * 5n, 1000n * 5n, 50000n * 5n, 75000n * 5n].map(withMultiplier),
          baseFeeQuotes: [
            expect.objectContaining({ fee: withMultiplier(1000n * 5n) }),
            expect.objectContaining({ fee: withMultiplier(1000n * 5n * 2n) }),
            expect.objectContaining({ fee: withMultiplier(1000n * 5n * 6n) }),
            expect.objectContaining({ fee: withMultiplier(1000n * 5n * 11n) }),
          ],
        });

        expect(txFeeResolver.getMinTxFee(assetId, TxType.DEPOSIT)).toBe(156000n);
        expect(txFeeResolver.getTxFee(assetId, TxType.WITHDRAW_TO_WALLET, SettlementTime.FAST)).toBe(336000n);
      }
    });

    it('return correct tx fee and fee quotes with max gas price', async () => {
      const maxFeeGasPrice = 6n;
      const txFeeResolver = await startNewResolver(
        new TxFeeResolver(
          blockchain,
          rollupDb,
          baseTxGas,
          maxFeeGasPrice,
          feeGasPriceMultiplier,
          txsPerRollup,
          publishInterval,
          surplusRatios,
          feeFreeAssets,
        ),
      );
      const cappedValue = (value: bigint) => (value * 6n) / 10n;

      {
        const assetId = AssetId.ETH;
        expect(txFeeResolver.getFeeQuotes(assetId)).toEqual({
          feeConstants: [50000n, 0n, 80000n, 300000n].map(cappedValue),
          baseFeeQuotes: [
            expect.objectContaining({ fee: cappedValue(10000n) }),
            expect.objectContaining({ fee: cappedValue(10000n * 2n) }),
            expect.objectContaining({ fee: cappedValue(10000n * 6n) }),
            expect.objectContaining({ fee: cappedValue(10000n * 11n) }),
          ],
        });
        expect(txFeeResolver.getMinTxFee(assetId, TxType.DEPOSIT)).toBe(36000n);
        expect(txFeeResolver.getTxFee(assetId, TxType.WITHDRAW_TO_WALLET, SettlementTime.FAST)).toBe(84000n);
      }

      {
        const assetId = AssetId.DAI;
        expect(txFeeResolver.getFeeQuotes(assetId)).toEqual({
          feeConstants: [25000n * 5n, 1000n * 5n, 50000n * 5n, 75000n * 5n].map(cappedValue),
          baseFeeQuotes: [
            expect.objectContaining({ fee: cappedValue(1000n * 5n) }),
            expect.objectContaining({ fee: cappedValue(1000n * 5n * 2n) }),
            expect.objectContaining({ fee: cappedValue(1000n * 5n * 6n) }),
            expect.objectContaining({ fee: cappedValue(1000n * 5n * 11n) }),
          ],
        });
        expect(txFeeResolver.getMinTxFee(assetId, TxType.DEPOSIT)).toBe(78000n);
        expect(txFeeResolver.getTxFee(assetId, TxType.WITHDRAW_TO_WALLET, SettlementTime.FAST)).toBe(168000n);
      }
    });

    it('return correct tx fee and fee quotes for asset with decimals', async () => {
      jest.spyOn(blockchain, 'getBlockchainStatus').mockImplementation(
        async () =>
          ({
            assets: [
              {
                decimals: 18,
                gasConstants: [5000, 0, 8000, 30000],
              },
              {
                decimals: 2,
                gasConstants: [25000, 1000, 50000, 75000],
              },
              {
                decimals: 24,
                gasConstants: [25000, 1000, 50000, 75000],
              },
            ],
          } as any),
      );
      jest.spyOn(mockTokenPriceFeed, 'getRoundData').mockImplementation(async (roundId: bigint) => ({
        roundId,
        price: 1000000n,
        timestamp: Math.floor(Date.now() / 1000),
      }));
      const txFeeResolver = await startNewResolver(
        new TxFeeResolver(
          blockchain,
          rollupDb,
          baseTxGas,
          maxFeeGasPrice,
          feeGasPriceMultiplier,
          txsPerRollup,
          publishInterval,
          surplusRatios,
          feeFreeAssets,
        ),
      );

      {
        const assetId = 1;
        expect(txFeeResolver.getFeeQuotes(assetId)).toEqual({
          feeConstants: [25n, 1n, 50n, 75n],
          baseFeeQuotes: [
            expect.objectContaining({ fee: 1n }),
            expect.objectContaining({ fee: 2n }),
            expect.objectContaining({ fee: 6n }),
            expect.objectContaining({ fee: 11n }),
          ],
        });

        expect(txFeeResolver.getMinTxFee(assetId, TxType.DEPOSIT)).toBe(26n);
        expect(txFeeResolver.getTxFee(assetId, TxType.WITHDRAW_TO_WALLET, SettlementTime.FAST)).toBe(56n);
      }

      {
        const assetId = 2;
        const withDecimals = (value: bigint) => value * 10n ** 22n;
        expect(txFeeResolver.getFeeQuotes(assetId)).toEqual({
          feeConstants: [25n, 1n, 50n, 75n].map(withDecimals),
          baseFeeQuotes: [
            expect.objectContaining({ fee: withDecimals(1n) }),
            expect.objectContaining({ fee: withDecimals(2n) }),
            expect.objectContaining({ fee: withDecimals(6n) }),
            expect.objectContaining({ fee: withDecimals(11n) }),
          ],
        });

        expect(txFeeResolver.getMinTxFee(assetId, TxType.DEPOSIT)).toBe(26n * 10n ** 22n);
        expect(txFeeResolver.getTxFee(assetId, TxType.WITHDRAW_TO_WALLET, SettlementTime.FAST)).toBe(56n * 10n ** 22n);
      }
    });

    it('return correct tx fee for tx free assets', async () => {
      const feeFreeAssets = [AssetId.DAI];
      const txFeeResolver = await startNewResolver(
        new TxFeeResolver(
          blockchain,
          rollupDb,
          baseTxGas,
          maxFeeGasPrice,
          feeGasPriceMultiplier,
          txsPerRollup,
          publishInterval,
          surplusRatios,
          feeFreeAssets,
        ),
      );

      {
        const assetId = AssetId.DAI;
        expect(txFeeResolver.getFeeQuotes(assetId)).toEqual({
          feeConstants: [0n, 0n, 0n, 0n],
          baseFeeQuotes: [
            expect.objectContaining({ fee: 0n }),
            expect.objectContaining({ fee: 0n }),
            expect.objectContaining({ fee: 0n }),
            expect.objectContaining({ fee: 0n }),
          ],
        });
        expect(txFeeResolver.getMinTxFee(assetId, TxType.DEPOSIT)).toBe(0n);
        expect(txFeeResolver.getTxFee(assetId, TxType.WITHDRAW_TO_WALLET, SettlementTime.FAST)).toBe(0n);
      }
    });

    it('time in fee quotes should never be less than 5 mins', async () => {
      const newPublishInterval = 5 * 60 + 1;
      const txFeeResolver = await startNewResolver(
        new TxFeeResolver(
          blockchain,
          rollupDb,
          baseTxGas,
          maxFeeGasPrice,
          feeGasPriceMultiplier,
          txsPerRollup,
          newPublishInterval,
          surplusRatios,
          feeFreeAssets,
        ),
      );

      expect(txFeeResolver.getFeeQuotes(AssetId.ETH).baseFeeQuotes).toEqual([
        expect.objectContaining({ time: 5 * 60 + 1 }),
        expect.objectContaining({ time: 5 * 60 }),
        expect.objectContaining({ time: 5 * 60 }),
        expect.objectContaining({ time: 5 * 60 }),
      ]);
    });
  });

  describe('surplus ratio', () => {
    const txTypes = [TxType.DEPOSIT, TxType.TRANSFER, TxType.WITHDRAW_TO_WALLET, TxType.WITHDRAW_TO_CONTRACT];
    const generateFullRollup = (speed: SettlementTime) =>
      Array(txsPerRollup)
        .fill(0)
        .map((_, i) => txTypes[i % txTypes.length])
        .map(txType =>
          toTxDao({
            assetId: AssetId.ETH,
            txType,
            fee: txFeeResolver.getTxFee(AssetId.ETH, txType, speed),
          }),
        );

    const float = (value: number) => +value.toFixed(2); // deal with float precision

    const startNewResolver = async (resolver: TxFeeResolver) => {
      jest
        .spyOn(resolver as any, 'getFeeForTxDao')
        .mockImplementation((({ assetId, fee }: MinimalTxDao) => ({ assetId, txFee: fee })) as any);
      await resolver.start();
    };

    beforeEach(async () => {
      await startNewResolver(txFeeResolver);
    });

    it('should compute correct surplus ratio for a tx with fee', () => {
      [SettlementTime.SLOW, SettlementTime.AVERAGE, SettlementTime.FAST, SettlementTime.INSTANT].forEach(speed => {
        const fee = txFeeResolver.getTxFee(AssetId.ETH, TxType.DEPOSIT, speed);
        const txs = toTxDaos([
          {
            assetId: AssetId.ETH,
            txType: TxType.DEPOSIT,
            fee,
          },
        ]);
        const ratio = txFeeResolver.computeSurplusRatio(txs);
        expect(ratio).toBe(surplusRatios[speed]);
      });
    });

    it('the ratio should never be negative', () => {
      const fee = txFeeResolver.getTxFee(AssetId.ETH, TxType.TRANSFER, SettlementTime.INSTANT);
      const txs = toTxDaos([
        {
          assetId: AssetId.ETH,
          fee: fee * 10n,
          txType: TxType.TRANSFER,
        },
      ]);
      const ratio = txFeeResolver.computeSurplusRatio(txs);
      expect(ratio).toBe(0);
    });

    it('the ratio should never be larger than 1 ', () => {
      const txs = toTxDaos([
        {
          assetId: AssetId.ETH,
          fee: 1n, // insufficient fee, feeSurplus is negative
          txType: TxType.TRANSFER,
        },
      ]);
      const ratio = txFeeResolver.computeSurplusRatio(txs);
      expect(ratio).toBe(1);
    });

    it('should compute correct surplus if base fee is empty', async () => {
      const fee = txFeeResolver.getTxFee(AssetId.ETH, TxType.TRANSFER, SettlementTime.INSTANT);
      expect(fee > 0n).toBe(true);
      const txs = toTxDaos([
        {
          assetId: AssetId.ETH,
          txType: TxType.TRANSFER,
          fee,
        },
      ]);
      const ratio = txFeeResolver.computeSurplusRatio(txs);
      expect(ratio).toBe(0);

      // Set gasPrice to 0.
      jest.spyOn(rollupDb, 'getRollups').mockImplementation(async () => toRollupDaos([{ id: 0, created: new Date() }]));
      jest.spyOn(mockGasPriceFeed, 'price').mockImplementation(async () => 0n);
      await (txFeeResolver as any).recordRollupPrices();

      const newFee = await txFeeResolver.getMinTxFee(AssetId.ETH, TxType.TRANSFER);
      expect(newFee).toBe(0n);
      const ratioWithoutFee = txFeeResolver.computeSurplusRatio(txs);
      expect(ratioWithoutFee).toBe(1);
    });

    it('should compute correct surplus ratio for a rollup of txs with no surplus', () => {
      const txs = generateFullRollup(SettlementTime.SLOW);
      expect(txFeeResolver.computeSurplusRatio(txs.slice(0, 1))).toBe(1);
      expect(txFeeResolver.computeSurplusRatio(txs)).toBe(1);
    });

    it('should compute correct surplus ratio for a rollup of "Average" txs', () => {
      const txs = generateFullRollup(SettlementTime.AVERAGE);
      expect(float(txFeeResolver.computeSurplusRatio(txs.slice(0, 1)))).toBe(0.9);
      expect(float(txFeeResolver.computeSurplusRatio(txs.slice(0, 2)))).toBe(0.8);
      expect(float(txFeeResolver.computeSurplusRatio(txs.slice(0, 4)))).toBe(0.6);
      expect(float(txFeeResolver.computeSurplusRatio(txs.slice(0, 7)))).toBe(0.3);
      expect(float(txFeeResolver.computeSurplusRatio(txs.slice(0, 9)))).toBe(0.1);
      expect(float(txFeeResolver.computeSurplusRatio(txs))).toBe(0);
    });

    it('should compute correct surplus ratio for a rollup of "Fast" txs', () => {
      const txs = generateFullRollup(SettlementTime.FAST);
      expect(txFeeResolver.computeSurplusRatio(txs.slice(0, 1))).toBe(0.5);
      expect(txFeeResolver.computeSurplusRatio(txs.slice(0, 2))).toBe(0);
      expect(txFeeResolver.computeSurplusRatio(txs)).toBe(0);
    });

    it('should compute correct surplus ratio for a rollup of "INSTANT" txs', () => {
      const txs = generateFullRollup(SettlementTime.INSTANT);
      expect(txFeeResolver.computeSurplusRatio(txs)).toBe(0);
    });

    it('should compute correct surplus ratio for txs with arbitrary fees', () => {
      const minFee = txFeeResolver.getMinTxFee(AssetId.ETH, TxType.TRANSFER);
      const baseFee = txFeeResolver.getFeeQuotes(AssetId.ETH).baseFeeQuotes[SettlementTime.SLOW].fee;
      const txs = toTxDaos([
        {
          assetId: AssetId.ETH,
          txType: TxType.TRANSFER,
          fee: minFee - baseFee * 2n,
        },
        {
          assetId: AssetId.ETH,
          txType: TxType.TRANSFER,
          fee: minFee + baseFee * 7n,
        },
        {
          assetId: AssetId.ETH,
          txType: TxType.TRANSFER,
          fee: minFee + baseFee * 3n,
        },
      ]);
      expect(float(txFeeResolver.computeSurplusRatio(txs))).toBe(0.2);
    });

    it('should compute correct surplus ratio for token asset', () => {
      const minFee = txFeeResolver.getMinTxFee(AssetId.DAI, TxType.TRANSFER);
      const baseFee = txFeeResolver.getFeeQuotes(AssetId.DAI).baseFeeQuotes[SettlementTime.SLOW].fee;
      const txs = toTxDaos([
        {
          assetId: AssetId.DAI,
          txType: TxType.TRANSFER,
          fee: minFee + baseFee * 2n,
        },
      ]);
      expect(float(txFeeResolver.computeSurplusRatio(txs))).toBe(0.8);
    });

    it('should compute correct surplus ratio for mixed assets', () => {
      const minEthFee = txFeeResolver.getMinTxFee(AssetId.ETH, TxType.TRANSFER);
      const baseEthFee = txFeeResolver.getFeeQuotes(AssetId.ETH).baseFeeQuotes[SettlementTime.SLOW].fee;
      const minFee = txFeeResolver.getMinTxFee(AssetId.DAI, TxType.TRANSFER);
      const baseFee = txFeeResolver.getFeeQuotes(AssetId.DAI).baseFeeQuotes[SettlementTime.SLOW].fee;
      const txs = toTxDaos([
        {
          assetId: AssetId.DAI,
          txType: TxType.TRANSFER,
          fee: minFee + baseFee * 2n,
        },
        {
          assetId: AssetId.ETH,
          txType: TxType.TRANSFER,
          fee: minEthFee + baseEthFee * 7n,
        },
        {
          assetId: AssetId.DAI,
          txType: TxType.TRANSFER,
          fee: minFee - baseFee * 3n,
        },
      ]);
      expect(float(txFeeResolver.computeSurplusRatio(txs))).toBe(0.4);
    });

    it('should compute correct surplus ratio for mixed assets with decimals', () => {
      jest.spyOn(blockchain, 'getBlockchainStatus').mockResolvedValue({
        assets: [
          {
            decimals: 18,
            gasConstants: [5000, 0, 8000, 30000],
          },
          {
            decimals: 12,
            gasConstants: [25000, 1000, 50000, 75000],
          },
        ],
      } as any);
      const minEthFee = txFeeResolver.getMinTxFee(AssetId.ETH, TxType.TRANSFER);
      const baseEthFee = txFeeResolver.getFeeQuotes(AssetId.ETH).baseFeeQuotes[SettlementTime.SLOW].fee;
      const minFee = txFeeResolver.getMinTxFee(AssetId.DAI, TxType.TRANSFER);
      const baseFee = txFeeResolver.getFeeQuotes(AssetId.DAI).baseFeeQuotes[SettlementTime.SLOW].fee;
      const txs = toTxDaos([
        {
          assetId: AssetId.DAI,
          txType: TxType.TRANSFER,
          fee: minFee + baseFee * 2n,
        },
        {
          assetId: AssetId.ETH,
          txType: TxType.TRANSFER,
          fee: minEthFee + baseEthFee * 7n,
        },
        {
          assetId: AssetId.DAI,
          txType: TxType.TRANSFER,
          fee: minFee - baseFee * 3n,
        },
      ]);
      expect(float(txFeeResolver.computeSurplusRatio(txs))).toBe(0.4);
    });

    it('should compute correct surplus ratio for free assets', async () => {
      const feeFreeAssets = [AssetId.DAI];
      const txFeeResolver = new TxFeeResolver(
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
      await startNewResolver(txFeeResolver);

      const assetId = AssetId.DAI;
      const minFee = txFeeResolver.getMinTxFee(assetId, TxType.TRANSFER);
      const baseFee = txFeeResolver.getFeeQuotes(assetId).baseFeeQuotes[SettlementTime.SLOW].fee;
      expect(
        float(
          txFeeResolver.computeSurplusRatio(
            toTxDaos([
              {
                assetId,
                txType: TxType.TRANSFER,
                fee: minFee,
              },
            ]),
          ),
        ),
      ).toBe(1);

      expect(
        float(
          txFeeResolver.computeSurplusRatio(
            toTxDaos([
              {
                assetId,
                txType: TxType.TRANSFER,
                fee: minFee + baseFee * 10n,
              },
            ]),
          ),
        ),
      ).toBe(1);
    });
  });

  describe('historical fees', () => {
    const minFee = async (rollupId: number) => txFeeResolver.getMinTxFee(AssetId.ETH, TxType.TRANSFER, rollupId);

    it('log new prices when next rollup id changes', async () => {
      await txFeeResolver.start();

      expect(await minFee(0)).toBe(1000n);

      // Proceed to rollup 1 with gas price 5
      jest.spyOn(rollupDb, 'getRollups').mockImplementation(async () => toRollupDaos([{ id: 0, created: new Date() }]));
      jest.spyOn(mockGasPriceFeed, 'price').mockImplementation(async () => 5n);
      await (txFeeResolver as any).recordRollupPrices();

      expect(await minFee(0)).toBe(1000n);
      expect(await minFee(1)).toBe(5000n);

      // Proceed to rollup 2 with gas price 100
      jest.spyOn(rollupDb, 'getRollups').mockImplementation(async () => toRollupDaos([{ id: 1, created: new Date() }]));
      jest.spyOn(mockGasPriceFeed, 'price').mockImplementation(async () => 100n);
      await (txFeeResolver as any).recordRollupPrices();

      expect(await minFee(0)).toBe(1000n);
      expect(await minFee(1)).toBe(5000n);
      expect(await minFee(2)).toBe(100000n);
    });

    it('return latest value if the prices for a rollup id does not exist', async () => {
      await txFeeResolver.start();

      expect(await minFee(0)).toBe(1000n);
      expect(await minFee(1)).toBe(1000n);
      expect(await minFee(2)).toBe(1000n);

      // Proceed to rollup 1 with gas price 5
      jest.spyOn(rollupDb, 'getRollups').mockImplementation(async () => toRollupDaos([{ id: 0, created: new Date() }]));
      jest.spyOn(mockGasPriceFeed, 'price').mockImplementation(async () => 5n);
      await (txFeeResolver as any).recordRollupPrices();

      expect(await minFee(0)).toBe(1000n);
      expect(await minFee(1)).toBe(5000n);
      expect(await minFee(2)).toBe(5000n);
    });
  });
});

import { AssetId } from 'barretenberg/asset';
import { Blockchain, PriceFeed } from 'barretenberg/blockchain';
import { EthPriceFeed } from 'blockchain';
import { RollupDb } from '../rollup_db';
import { PriceTracker } from './price_tracker';

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

describe('price tracker', () => {
  const assetIds = [AssetId.ETH, AssetId.DAI];
  let dateSpy: jest.SpyInstance<number>;
  let gasPriceFeed: Mockify<PriceFeed>;
  let tokenPriceFeed: Mockify<PriceFeed>;
  let blockchain: Mockify<Blockchain>;
  let rollupDb: Mockify<RollupDb>;
  let priceTracker!: PriceTracker;

  // roundId:     5  4  3  2  1   0
  // timestamp: now -2 -4 -6 -8 -10 (seconds)
  const getTimestamp = (roundId: bigint) => Math.floor(Date.now() / 1000) - 10 + Number(roundId) * 2;

  beforeEach(() => {
    dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => 1618226064000);

    gasPriceFeed = {
      latestRound: jest.fn().mockResolvedValue(5n),
      price: jest.fn().mockResolvedValue(123n),
      getRoundData: jest.fn().mockImplementation((roundId: bigint) => ({
        roundId,
        price: roundId * 10n,
        timestamp: getTimestamp(roundId),
      })),
    } as any;

    tokenPriceFeed = {
      latestRound: jest.fn().mockResolvedValue(5n),
      price: jest.fn().mockResolvedValue(456n),
      getRoundData: jest.fn().mockImplementation((roundId: bigint) => ({
        roundId,
        price: 789n + roundId,
        timestamp: getTimestamp(roundId),
      })),
    } as any;

    blockchain = {
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

    priceTracker = new PriceTracker(blockchain, rollupDb, assetIds);
  });

  afterEach(async () => {
    dateSpy.mockRestore();
    await priceTracker.stop();
  });

  it('restore from latest prices if there is no previous rollup', async () => {
    await priceTracker.start();
    expect(priceTracker.getGasPrice()).toBe(50n);
    expect(priceTracker.getAssetPrice(AssetId.ETH)).toBe(10n ** 18n);
    expect(priceTracker.getAssetPrice(AssetId.DAI)).toBe(789n + 5n);
  });

  it('restore prices from the created time of the latest rollup', async () => {
    rollupDb.getRollups.mockImplementation(() => [
      {
        id: 1,
        created: new Date(Date.now() - 4000),
      },
    ]);
    await priceTracker.start();
    expect(priceTracker.getGasPrice()).toBe(30n);
    expect(priceTracker.getAssetPrice(AssetId.ETH)).toBe(10n ** 18n);
    expect(priceTracker.getAssetPrice(AssetId.DAI)).toBe(789n + 3n);
  });

  it('restore prices from before the created time of the latest rollup', async () => {
    rollupDb.getRollups.mockImplementation(() => [
      {
        id: 1,
        created: new Date(Date.now() - 5000),
      },
    ]);
    await priceTracker.start();
    expect(priceTracker.getGasPrice()).toBe(20n);
    expect(priceTracker.getAssetPrice(AssetId.ETH)).toBe(10n ** 18n);
    expect(priceTracker.getAssetPrice(AssetId.DAI)).toBe(789n + 2n);
  });

  it('restore to the first none-zero prices', async () => {
    rollupDb.getRollups.mockImplementation(() => [
      {
        id: 1,
        created: new Date(Date.now() - 20000),
      },
    ]);
    await priceTracker.start();
    expect(priceTracker.getGasPrice()).toBe(10n);
    expect(priceTracker.getAssetPrice(AssetId.ETH)).toBe(10n ** 18n);
    expect(priceTracker.getAssetPrice(AssetId.DAI)).toBe(789n);
  });

  it('update to current prices when next rollup id changes', async () => {
    await priceTracker.start();
    expect(priceTracker.getGasPrice()).toBe(50n);
    expect(priceTracker.getAssetPrice(AssetId.ETH)).toBe(10n ** 18n);
    expect(priceTracker.getAssetPrice(AssetId.DAI)).toBe(789n + 5n);

    rollupDb.getRollups.mockImplementationOnce(() => [
      {
        id: 1,
        created: new Date(),
      },
    ]);
    await new Promise(resolve => setTimeout(resolve, 2000));

    expect(priceTracker.getGasPrice()).toBe(123n);
    expect(priceTracker.getAssetPrice(AssetId.ETH)).toBe(10n ** 18n);
    expect(priceTracker.getAssetPrice(AssetId.DAI)).toBe(456n);
  });

  it('return 0 if not started yet', async () => {
    expect(priceTracker.getGasPrice()).toBe(0n);
    expect(priceTracker.getAssetPrice(AssetId.ETH)).toBe(0n);
    expect(priceTracker.getAssetPrice(AssetId.DAI)).toBe(0n);
  });
});

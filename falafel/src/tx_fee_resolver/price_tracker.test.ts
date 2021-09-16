import { AssetId } from 'barretenberg/asset';
import { Blockchain, PriceFeed } from 'barretenberg/blockchain';
import { EthPriceFeed } from 'blockchain';
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
  let priceTracker!: PriceTracker;

  beforeEach(() => {
    dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => 1618226064000);

    gasPriceFeed = {
      price: jest.fn().mockResolvedValue(123n),
    } as any;

    tokenPriceFeed = {
      price: jest.fn().mockResolvedValue(456n),
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

    priceTracker = new PriceTracker(blockchain, assetIds, 1000);
  });

  afterEach(async () => {
    dateSpy.mockRestore();
    await priceTracker.stop();
  });

  it('record prices', async () => {
    await priceTracker.start();
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

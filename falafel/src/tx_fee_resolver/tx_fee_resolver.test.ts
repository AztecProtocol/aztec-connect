import { AssetId } from '@aztec/barretenberg/asset';
import { Blockchain, PriceFeed, TxType } from '@aztec/barretenberg/blockchain';
import { BitConfig, BridgeId } from '@aztec/barretenberg/bridge_id';
import { EthPriceFeed } from '@aztec/blockchain';
import { BridgeResolver } from '../bridge';
import { TxFeeResolver } from './index';

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
  const surplusRatios = [1, 0];
  const freeAssets: AssetId[] = [];
  const freeTxTypes: TxType[] = [];
  const numSignificantFigures = 0;
  let dateSpy: jest.SpyInstance<number>;
  let gasPriceFeed: Mockify<PriceFeed>;
  let tokenPriceFeed: Mockify<PriceFeed>;
  let blockchain: Mockify<Blockchain>;
  let bridgeCostResolver: Mockify<BridgeResolver>;
  let txFeeResolver!: TxFeeResolver;

  beforeEach(async () => {
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

    bridgeCostResolver = {
      getMinBridgeTxGas: jest.fn().mockReturnValue(100000n),
      getFullBridgeGas: jest.fn().mockReturnValue(100000000n),
    } as any;

    txFeeResolver = new TxFeeResolver(
      blockchain,
      bridgeCostResolver as any,
      baseTxGas,
      maxFeeGasPrice,
      feeGasPriceMultiplier,
      txsPerRollup,
      publishInterval,
      surplusRatios,
      freeAssets,
      freeTxTypes,
      numSignificantFigures,
    );

    await txFeeResolver.start();
  });

  afterEach(() => {
    dateSpy.mockRestore();
  });

  it('return correct min fees', async () => {
    expect(txFeeResolver.getMinTxFee(AssetId.ETH, TxType.DEPOSIT)).toBe(2000000000000000n + 625000000000000n);
    expect(txFeeResolver.getMinTxFee(AssetId.DAI, TxType.DEPOSIT)).toBe(20000n + 6250n);
  });

  it('return correct tx fees', async () => {
    {
      const assetId = AssetId.ETH;
      expect(txFeeResolver.getTxFees(assetId)).toEqual([
        [
          { assetId, value: 2625000000000000n },
          { assetId, value: 22625000000000000n },
        ],
        [
          { assetId, value: 2000000000000000n },
          { assetId, value: 22000000000000000n },
        ],
        [
          { assetId, value: 2375000000000000n },
          { assetId, value: 22375000000000000n },
        ],
        [
          { assetId, value: 5750000000000000n },
          { assetId, value: 25750000000000000n },
        ],
        [
          { assetId, value: 2000000000000000n },
          { assetId, value: 22000000000000000n },
        ],
        [
          { assetId, value: 6500000000000000n },
          { assetId, value: 26500000000000000n },
        ],
        [
          { assetId, value: 4500000000000000n },
          { assetId, value: 24500000000000000n },
        ],
      ]);
    }
    {
      const assetId = AssetId.DAI;
      expect(txFeeResolver.getTxFees(assetId)).toEqual([
        [
          { assetId, value: 26250n },
          { assetId, value: 226250n },
        ],
        [
          { assetId, value: 20000n },
          { assetId, value: 220000n },
        ],
        [
          { assetId, value: 24500n },
          { assetId, value: 224500n },
        ],
        [
          { assetId, value: 65000n },
          { assetId, value: 265000n },
        ],
        [
          { assetId, value: 20000n },
          { assetId, value: 220000n },
        ],
        [
          { assetId, value: 20000n },
          { assetId, value: 220000n },
        ],
        [
          { assetId, value: 20000n },
          { assetId, value: 220000n },
        ],
      ]);
    }
  });

  it('return correct defi fees', async () => {
    const assetId = AssetId.ETH;
    const bridgeId = new BridgeId(0, assetId, 0, 0, 0, BitConfig.random(), 0).toBigInt();
    const defiFees = txFeeResolver.getDefiFees(bridgeId);
    expect(defiFees).toEqual([
      { assetId, value: 25500000000000000n },
      { assetId, value: 12513000000000000000n },
      { assetId, value: 12533000000000000000n },
    ]);
  });
});

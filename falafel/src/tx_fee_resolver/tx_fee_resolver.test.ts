import { EthAddress } from '@aztec/barretenberg/address';
import { Blockchain, BlockchainAsset, PriceFeed } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { EthPriceFeed } from '@aztec/blockchain';
import { BridgeResolver } from '../bridge';
import { TxFeeResolver } from './index';

jest.useFakeTimers();

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

describe('tx fee resolver', () => {
  const ETHGasPrice = 50000000000n;
  const verificationGas = 100000;
  const feePayingAssetIds = [0, 1];
  const maxFeeGasPrice = 250000000000n;
  const feeGasPriceMultiplier = 2.5;
  const txsPerRollup = 10;
  const numSignificantFigures = 0;
  let dateSpy: jest.SpyInstance<number>;
  let gasPriceFeed: Mockify<PriceFeed>;
  let tokenPriceFeed: Mockify<PriceFeed>;
  let blockchain: Mockify<Blockchain>;
  let bridgeCostResolver: Mockify<BridgeResolver>;
  let txFeeResolver!: TxFeeResolver;

  const assets: Partial<BlockchainAsset>[] = [
    {
      address: EthAddress.randomAddress(),
      decimals: 18,
    },
    {
      address: EthAddress.randomAddress(),
      decimals: 8,
    },
    {
      address: EthAddress.randomAddress(),
      decimals: 18,
    },
  ];

  beforeEach(async () => {
    dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => 1618226064000);

    gasPriceFeed = {
      latestRound: jest.fn().mockResolvedValue(1n),
      price: jest.fn().mockResolvedValue(ETHGasPrice),
      getRoundData: jest.fn().mockResolvedValue({
        roundId: 1n,
        price: ETHGasPrice,
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
      getBlockchainStatus: jest.fn().mockReturnValue({
        assets,
      }),
      getGasPriceFeed: jest.fn().mockReturnValue(gasPriceFeed),
      getPriceFeed: jest.fn().mockImplementation((assetId: number) => {
        if (assetId === 0) {
          return new EthPriceFeed();
        }
        return tokenPriceFeed;
      }),
    } as any;

    bridgeCostResolver = {
      getMinBridgeTxGas: jest.fn().mockReturnValue(100000),
      getFullBridgeGas: jest.fn().mockReturnValue(100000000),
    } as any;

    txFeeResolver = new TxFeeResolver(
      blockchain,
      bridgeCostResolver as any,
      verificationGas,
      maxFeeGasPrice,
      feeGasPriceMultiplier,
      txsPerRollup,
      feePayingAssetIds,
      numSignificantFigures,
    );

    await txFeeResolver.start();
  });

  afterEach(() => {
    dateSpy.mockRestore();
  });

  it('return correct defi fees', async () => {
    const assetId = 0;
    const bridgeId = new BridgeId(0, assetId, 0).toBigInt();
    const defiFees = txFeeResolver.getDefiFees(bridgeId);
    expect(defiFees).toEqual([
      { assetId, value: 15299000000000000n },
      { assetId, value: 12502799000000000000n },
      { assetId, value: 12514049000000000000n },
    ]);
  });

  it('correctly determines if fee paying asset', async () => {
    expect(txFeeResolver.isFeePayingAsset(0)).toEqual(true);
    expect(txFeeResolver.isFeePayingAsset(1)).toEqual(true);
    expect(txFeeResolver.isFeePayingAsset(2)).toEqual(false);
  });
});

import { EthAddress } from '@aztec/barretenberg/address';
import { Blockchain, BlockchainAsset, PriceFeed } from '@aztec/barretenberg/blockchain';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { EthPriceFeed } from '@aztec/blockchain';
import { BridgeResolver } from '../bridge/index.js';
import { TxFeeResolver } from './index.js';
import { jest } from '@jest/globals';

jest.useFakeTimers({ doNotFake: ['performance'] });

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
  const callDataPerRollup = 128 * 1024;
  const gasLimitPerRollup = 12000000;
  let dateSpy: any;
  let gasPriceFeed: Mockify<PriceFeed>;
  let tokenPriceFeed: Mockify<PriceFeed>;
  let blockchain: Mockify<Blockchain>;
  let bridgeCostResolver: Mockify<BridgeResolver>;
  let txFeeResolver!: TxFeeResolver;

  const assets: Partial<BlockchainAsset>[] = [
    {
      address: EthAddress.random(),
      decimals: 18,
      gasLimit: 30000,
    },
    {
      address: EthAddress.random(),
      decimals: 8,
      gasLimit: 60000,
    },
    {
      address: EthAddress.random(),
      decimals: 18,
      gasLimit: 60000,
    },
  ];

  beforeEach(async () => {
    dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => 1618226064000);
    jest.spyOn(console, 'log').mockImplementation(() => {});

    gasPriceFeed = {
      latestRound: jest.fn<any>().mockResolvedValue(1n),
      price: jest.fn<any>().mockResolvedValue(ETHGasPrice),
      getRoundData: jest.fn<any>().mockResolvedValue({
        roundId: 1n,
        price: ETHGasPrice,
        timestamp: Math.floor(Date.now() / 1000),
      }),
    } as any;

    tokenPriceFeed = {
      latestRound: jest.fn<any>().mockResolvedValue(1n),
      price: jest.fn<any>().mockResolvedValue(10n * 10n ** 18n),
      getRoundData: jest.fn<any>().mockResolvedValue({
        roundId: 1n,
        price: 10n * 10n ** 18n,
        timestamp: Math.floor(Date.now() / 1000),
      }),
    } as any;

    blockchain = {
      getBlockchainStatus: jest.fn().mockReturnValue({
        assets,
      }),
      getGasPriceFeed: jest.fn<any>().mockReturnValue(gasPriceFeed),
      getPriceFeed: jest.fn((assetId: number) => {
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
      callDataPerRollup,
      gasLimitPerRollup,
      numSignificantFigures,
    );

    await txFeeResolver.start();
  });

  afterEach(() => {
    dateSpy.mockRestore();
  });

  it('return correct defi fees', () => {
    const assetId = 0;
    const bridgeCallData = new BridgeCallData(0, assetId, 0).toBigInt();
    const defiFees = txFeeResolver.getDefiFees(bridgeCallData);
    expect(defiFees).toEqual([
      { assetId, value: 16196000000000000n },
      { assetId, value: 12503696000000000000n },
      { assetId, value: 12514946000000000000n },
    ]);
  });

  it('correctly determines if fee paying asset', () => {
    expect(txFeeResolver.isFeePayingAsset(0)).toEqual(true);
    expect(txFeeResolver.isFeePayingAsset(1)).toEqual(true);
    expect(txFeeResolver.isFeePayingAsset(2)).toEqual(false);
  });

  it('return correct defi fees on exit-only mode', async () => {
    const assetId = 0;
    const bridgeCallData = new BridgeCallData(0, assetId, 0).toBigInt();
    txFeeResolver = new TxFeeResolver(
      blockchain,
      bridgeCostResolver as any,
      verificationGas,
      maxFeeGasPrice,
      feeGasPriceMultiplier,
      txsPerRollup,
      feePayingAssetIds,
      callDataPerRollup,
      gasLimitPerRollup,
      numSignificantFigures,
      true,
    );
    await txFeeResolver.start();

    const defiFees = txFeeResolver.getDefiFees(bridgeCallData);
    expect(defiFees).toEqual([
      { assetId, value: 0n },
      { assetId, value: 12503696000000000000n },
      { assetId, value: 12514946000000000000n },
    ]);
  });
});

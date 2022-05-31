import { BlockchainAsset, TxType } from '@aztec/barretenberg/blockchain';
import { FeeCalculator } from './fee_calculator';
import { PriceTracker } from './price_tracker';

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

describe('fee calculator', () => {
  const assets = [
    {
      decimals: 18,
      gasLimit: 30000,
    },
    {
      decimals: 0,
      gasLimit: 30000,
    },
  ] as BlockchainAsset[];
  const verificationGas = 100000;
  const maxFeeGasPrice = 0n;
  const feeGasPriceMultiplier = 1;
  const txsPerRollup = 10;
  const numSignificantFigures = 0;
  let priceTracker: Mockify<PriceTracker>;
  let feeCalculator: FeeCalculator;

  beforeEach(() => {
    priceTracker = {
      getGasPrice: jest.fn().mockReturnValue(100n),
      getAssetPrice: jest.fn().mockImplementation((assetId: number) => {
        if (assetId === 0) {
          return 10n ** 18n;
        }
        return 2n;
      }),
      getMinGasPrice: jest.fn().mockReturnValue(50n),
      getMinAssetPrice: jest.fn().mockImplementation((assetId: number) => {
        if (assetId === 0) {
          return 10n ** 18n;
        }
        return 2n;
      }),
    } as any;

    feeCalculator = new FeeCalculator(
      priceTracker as any,
      assets,
      verificationGas,
      maxFeeGasPrice,
      feeGasPriceMultiplier,
      txsPerRollup,
      numSignificantFigures,
    );
  });

  it('return correct min fees', async () => {
    expect(feeCalculator.getMinTxFee(0, TxType.DEPOSIT)).toBe(783200n);
    expect(feeCalculator.getMinTxFee(1, TxType.DEPOSIT)).toBe(391600n);
  });

  it('returns correct tx fees for non fee-paying asset', async () => {
    const assetId = 0;
    const result = feeCalculator.getTxFees(assetId);
    const expected = [
      [
        { assetId, value: 1566400n },
        { assetId, value: 10566400n },
      ],
      [
        { assetId, value: 1168400n },
        { assetId, value: 10168400n },
      ],
      [
        { assetId, value: 4190800n },
        { assetId, value: 13190800n },
      ],
      [
        { assetId, value: 4190800n },
        { assetId, value: 13190800n },
      ],
      [
        { assetId, value: 1115600n },
        { assetId, value: 10115600n },
      ],
      [
        { assetId, value: 1187600n },
        { assetId, value: 10187600n },
      ],
      [
        { assetId, value: 1051600n },
        { assetId, value: 10051600n },
      ],
    ];
    expect(result).toEqual(expected);
  });
});

import { BlockchainAsset, TxType } from '@aztec/barretenberg/blockchain';
import { FeeCalculator } from './fee_calculator';
import { mockTx } from './fixtures';
import { PriceTracker } from './price_tracker';

enum TestSettlementTime {
  SLOW,
  AVERAGE,
  FAST,
  INSTANT,
}

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

describe('fee calculator', () => {
  const assets = [
    {
      decimals: 18,
      gasConstants: [12000, 0, 34, 0, 0, 0, 0],
    },
    {
      decimals: 0,
      gasConstants: [56000, 0, 78, 0, 0, 0, 0],
    },
  ] as BlockchainAsset[];
  const baseTxGas = 1000;
  const maxFeeGasPrice = 0n;
  const feeGasPriceMultiplier = 1;
  const txsPerRollup = 10;
  const publishInterval = 3600;
  const surplusRatios = [1, 0.9, 0.5, 0];
  const freeAssets: number[] = [];
  const freeTxTypes = [TxType.ACCOUNT, TxType.DEFI_DEPOSIT, TxType.DEFI_CLAIM];
  const numSignificantFigures = 0;
  let priceTracker: Mockify<PriceTracker>;
  let feeCalculator: FeeCalculator;

  const mockPrices = (gasPrice: bigint, assetPrice: bigint) => {
    priceTracker.getGasPrice.mockReturnValue(gasPrice);
    priceTracker.getAssetPrice.mockImplementation((assetId: number) => {
      if (assetId === 0) {
        return 10n ** 18n;
      }
      return assetPrice;
    });
    priceTracker.getMinGasPrice.mockReturnValue(gasPrice);
    priceTracker.getMinAssetPrice.mockImplementation((assetId: number) => {
      if (assetId === 0) {
        return 10n ** 18n;
      }
      return assetPrice;
    });
  };

  beforeEach(() => {
    priceTracker = {
      getGasPrice: jest.fn().mockReturnValue(50n),
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
  });

  describe('fee quotes', () => {
    it('return correct tx fee and fee quotes', async () => {
      {
        const assetId = 0;
        const baseFee = 50000n;
        expect(feeCalculator.getFeeQuotes(assetId)).toEqual({
          feeConstants: [650000n, 50000n, 51700n, 50000n, 0n, 0n, 0n],
          baseFeeQuotes: [
            {
              fee: 0n,
              time: publishInterval,
            },
            {
              fee: baseFee * 1n,
              time: publishInterval * 0.9,
            },
            {
              fee: baseFee * 5n,
              time: publishInterval * 0.5,
            },
            {
              fee: baseFee * 10n,
              time: 5 * 60,
            },
          ],
        });

        expect(feeCalculator.getTxFee(assetId, TxType.DEPOSIT)).toBe(650000n);
        expect(feeCalculator.getTxFee(assetId, TxType.TRANSFER)).toBe(50000n);
        expect(feeCalculator.getTxFee(assetId, TxType.WITHDRAW_TO_WALLET)).toBe(51700n);
        expect(feeCalculator.getTxFee(assetId, TxType.WITHDRAW_TO_CONTRACT)).toBe(50000n);
      }

      {
        const assetId = 1;
        const baseFee = 25000n;
        expect(feeCalculator.getFeeQuotes(assetId)).toEqual({
          feeConstants: [1425000n, 25000n, 26950n, 25000n, 0n, 0n, 0n],
          baseFeeQuotes: [
            {
              fee: 0n,
              time: publishInterval,
            },
            {
              fee: baseFee * 1n,
              time: publishInterval * 0.9,
            },
            {
              fee: baseFee * 5n,
              time: publishInterval * 0.5,
            },
            {
              fee: baseFee * 10n,
              time: 5 * 60,
            },
          ],
        });

        expect(feeCalculator.getTxFee(assetId, TxType.DEPOSIT)).toBe(1425000n);
        expect(feeCalculator.getTxFee(assetId, TxType.TRANSFER)).toBe(25000n);
        expect(feeCalculator.getTxFee(assetId, TxType.WITHDRAW_TO_WALLET)).toBe(26950n);
        expect(feeCalculator.getTxFee(assetId, TxType.WITHDRAW_TO_CONTRACT)).toBe(25000n);
      }
    });

    it('return correct tx fee and fee quotes with fee multiplier', async () => {
      const feeGasPriceMultiplier = 1.2;
      feeCalculator = new FeeCalculator(
        priceTracker as any,
        assets,
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

      const withMultiplier = (value: bigint) => (value * 120n) / 100n;

      {
        const assetId = 0;
        const baseFee = 50000n;
        expect(feeCalculator.getFeeQuotes(assetId)).toEqual({
          feeConstants: [650000n, 50000n, 51700n, 50000n, 0n, 0n, 0n].map(withMultiplier),
          baseFeeQuotes: [
            expect.objectContaining({ fee: 0n }),
            expect.objectContaining({ fee: withMultiplier(baseFee) }),
            expect.objectContaining({ fee: withMultiplier(baseFee * 5n) }),
            expect.objectContaining({ fee: withMultiplier(baseFee * 10n) }),
          ],
        });
      }

      {
        const assetId = 1;
        const baseFee = 25000n;
        expect(feeCalculator.getFeeQuotes(assetId)).toEqual({
          feeConstants: [1425000n, 25000n, 26950n, 25000n, 0n, 0n, 0n].map(withMultiplier),
          baseFeeQuotes: [
            expect.objectContaining({ fee: 0n }),
            expect.objectContaining({ fee: withMultiplier(baseFee) }),
            expect.objectContaining({ fee: withMultiplier(baseFee * 5n) }),
            expect.objectContaining({ fee: withMultiplier(baseFee * 10n) }),
          ],
        });
      }
    });

    it('return correct tx fee and fee quotes with max gas price', async () => {
      const maxFeeGasPrice = 35n;
      feeCalculator = new FeeCalculator(
        priceTracker as any,
        assets,
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

      const cappedValue = (value: bigint) => value * maxFeeGasPrice;

      {
        const assetId = 0;
        const baseFee = BigInt(baseTxGas);
        expect(feeCalculator.getFeeQuotes(assetId)).toEqual({
          feeConstants: [13000n, 1000n, 1034n, 1000n, 0n, 0n, 0n].map(cappedValue),
          baseFeeQuotes: [
            expect.objectContaining({ fee: 0n }),
            expect.objectContaining({ fee: cappedValue(baseFee) }),
            expect.objectContaining({ fee: cappedValue(baseFee * 5n) }),
            expect.objectContaining({ fee: cappedValue(baseFee * 10n) }),
          ],
        });
      }

      {
        const assetId = 1;
        const baseFee = BigInt(baseTxGas) / 2n;
        expect(feeCalculator.getFeeQuotes(assetId)).toEqual({
          feeConstants: [28500n, 500n, 539n, 500n, 0n, 0n, 0n].map(cappedValue),
          baseFeeQuotes: [
            expect.objectContaining({ fee: 0n }),
            expect.objectContaining({ fee: cappedValue(baseFee) }),
            expect.objectContaining({ fee: cappedValue(baseFee * 5n) }),
            expect.objectContaining({ fee: cappedValue(baseFee * 10n) }),
          ],
        });
      }
    });

    it('return correct tx fee and fee quotes for asset with decimals', async () => {
      mockPrices(50n, 1n);

      const assets = [
        {
          decimals: 18,
          gasConstants: [1, 0, 3, 0, 0, 0, 0],
        },
        {
          decimals: 8,
          gasConstants: [12, 0, 34, 0, 0, 0, 0],
        },
      ] as BlockchainAsset[];
      feeCalculator = new FeeCalculator(
        priceTracker as any,
        assets,
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

      const withDecimals = (value: bigint) => value * 10n ** 8n;

      {
        const assetId = 1;
        const baseFee = 50000n;
        expect(feeCalculator.getFeeQuotes(assetId)).toEqual({
          feeConstants: [50600n, 50000n, 51700n, 50000n, 0n, 0n, 0n].map(withDecimals),
          baseFeeQuotes: [
            expect.objectContaining({ fee: 0n }),
            expect.objectContaining({ fee: withDecimals(baseFee) }),
            expect.objectContaining({ fee: withDecimals(baseFee * 5n) }),
            expect.objectContaining({ fee: withDecimals(baseFee * 10n) }),
          ],
        });
      }
    });

    it('return zero fees for free asset', async () => {
      const freeAssets = [1];
      feeCalculator = new FeeCalculator(
        priceTracker as any,
        assets,
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

      {
        const assetId = 1;
        expect(feeCalculator.getFeeQuotes(assetId)).toEqual({
          feeConstants: [0n, 0n, 0n, 0n, 0n, 0n, 0n],
          baseFeeQuotes: [
            expect.objectContaining({ fee: 0n }),
            expect.objectContaining({ fee: 0n }),
            expect.objectContaining({ fee: 0n }),
            expect.objectContaining({ fee: 0n }),
          ],
        });
      }
    });

    it('return correct tx fee for free txTypes', async () => {
      const freeTxTypes = [TxType.TRANSFER];
      feeCalculator = new FeeCalculator(
        priceTracker as any,
        assets,
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

      {
        const assetId = 0;
        const baseFee = 50000n;
        expect(feeCalculator.getFeeQuotes(assetId)).toEqual({
          feeConstants: [650000n, 0n, 51700n, 50000n, 50000n, 50000n, 50000n],
          baseFeeQuotes: [
            expect.objectContaining({ fee: 0n }),
            expect.objectContaining({ fee: baseFee * 1n }),
            expect.objectContaining({ fee: baseFee * 5n }),
            expect.objectContaining({ fee: baseFee * 10n }),
          ],
        });
        expect(feeCalculator.getTxFee(assetId, TxType.TRANSFER)).toBe(0n);
        expect(feeCalculator.getTxFee(assetId, TxType.DEPOSIT)).toBe(650000n);
      }
    });

    it('return correct gas for fee paid', async () => {
      const feeGasPriceMultiplier = 0.5;
      feeCalculator = new FeeCalculator(
        priceTracker as any,
        assets,
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

      {
        // with the multipler, the 100 gas price becomes a 50
        // The 2n means the 500 DAI becomes 1000 ETH
        mockPrices(100n, 2n);
        const assetId = 1;
        const gas = feeCalculator.getGasPaidForByFee(assetId, 500n);
        // 1000 / 50
        expect(gas).toEqual(20n);
      }
    });

    it('time in fee quotes should never be less than 5 mins', async () => {
      const publishInterval = 5 * 60 + 1;
      feeCalculator = new FeeCalculator(
        priceTracker as any,
        assets,
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

      expect(feeCalculator.getFeeQuotes(0).baseFeeQuotes).toEqual([
        expect.objectContaining({ time: 5 * 60 + 1 }),
        expect.objectContaining({ time: 5 * 60 }),
        expect.objectContaining({ time: 5 * 60 }),
        expect.objectContaining({ time: 5 * 60 }),
      ]);
    });

    it('round up fees', async () => {
      mockPrices(12345n, 9n);
      const numSignificantFigures = 2;
      feeCalculator = new FeeCalculator(
        priceTracker as any,
        assets,
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

      {
        const assetId = 0;
        const baseFee = 13000000n;
        expect(feeCalculator.getFeeQuotes(assetId)).toEqual({
          feeConstants: [163000000n, 13000000n, 13420000n, 13000000n, 0n, 0n, 0n],
          baseFeeQuotes: [
            expect.objectContaining({ fee: 0n }),
            expect.objectContaining({ fee: baseFee * 1n }),
            expect.objectContaining({ fee: baseFee * 5n }),
            expect.objectContaining({ fee: baseFee * 10n }),
          ],
        });
      }

      {
        const assetId = 1;
        const baseFee = 1400000n;
        expect(feeCalculator.getFeeQuotes(assetId)).toEqual({
          feeConstants: [78400000n, 1400000n, 1510000n, 1400000n, 0n, 0n, 0n],
          baseFeeQuotes: [
            expect.objectContaining({ fee: 0n }),
            expect.objectContaining({ fee: baseFee * 1n }),
            expect.objectContaining({ fee: baseFee * 5n }),
            expect.objectContaining({ fee: baseFee * 10n }),
          ],
        });
      }
    });

    it('return current fee and min fee', async () => {
      priceTracker.getGasPrice.mockReturnValue(11n);
      priceTracker.getAssetPrice.mockReturnValue(21n);
      priceTracker.getMinGasPrice.mockReturnValue(10n);
      priceTracker.getMinAssetPrice.mockReturnValue(20n);
      expect(feeCalculator.getTxFee(1, TxType.DEPOSIT)).toBe(29856n);
      expect(feeCalculator.getMinTxFee(1, TxType.DEPOSIT)).toBe(28500n);
    });
  });

  describe('surplus ratio', () => {
    const getTxFee = (assetId: number, txType: TxType, speed: TestSettlementTime) => {
      const { feeConstants, baseFeeQuotes } = feeCalculator.getFeeQuotes(assetId);
      return feeConstants[txType] + baseFeeQuotes[speed].fee;
    };

    it('should compute correct surplus ratio for different settlement time', () => {
      [
        TestSettlementTime.SLOW,
        TestSettlementTime.AVERAGE,
        TestSettlementTime.FAST,
        TestSettlementTime.INSTANT,
      ].forEach(speed => {
        const fee = getTxFee(0, TxType.DEPOSIT, speed);
        const txs = [mockTx(0, TxType.DEPOSIT, fee)];
        expect(feeCalculator.computeSurplusRatio(txs)).toBe(surplusRatios[speed]);
      });
    });

    it('should compute correct surplus ratio for txs with min fees', () => {
      [
        TxType.DEPOSIT,
        TxType.TRANSFER,
        TxType.WITHDRAW_TO_WALLET,
        TxType.WITHDRAW_TO_CONTRACT,
        TxType.ACCOUNT,
        TxType.DEFI_DEPOSIT,
        TxType.DEFI_CLAIM,
      ].forEach(txType => {
        const fee = feeCalculator.getTxFee(0, txType);
        const txs = [mockTx(0, txType, fee)];
        expect(feeCalculator.computeSurplusRatio(txs)).toBe(1);
      });
    });

    it('surplus ratio should never be negative', () => {
      const minFee = feeCalculator.getTxFee(0, TxType.DEPOSIT);
      const baseFee = feeCalculator.getBaseFee(0);
      const txs = [mockTx(0, TxType.DEPOSIT, minFee + baseFee * 100n)];
      expect(feeCalculator.computeSurplusRatio(txs)).toBe(0);
    });

    it('surplus ratio should never be larger than 1 ', () => {
      const minFee = feeCalculator.getTxFee(0, TxType.DEPOSIT);
      const baseFee = feeCalculator.getBaseFee(0);
      const txs = [mockTx(0, TxType.DEPOSIT, minFee - baseFee)]; // insufficient fee, feeSurplus is negative
      expect(feeCalculator.computeSurplusRatio(txs)).toBe(1);
    });

    it('surplus ratio should be 1 if base fee is zero', async () => {
      mockPrices(0n, 10n);

      const minFee = feeCalculator.getTxFee(0, TxType.DEPOSIT);
      expect(minFee).toBe(0n);

      const ethTxs = [mockTx(0, TxType.DEPOSIT, 1n)];
      expect(feeCalculator.computeSurplusRatio(ethTxs)).toBe(1);

      const daiTxs = [mockTx(1, TxType.DEPOSIT, 1n)];
      expect(feeCalculator.computeSurplusRatio(daiTxs)).toBe(1);
    });

    it('surplus ratio should be 1 if asset price is zero', async () => {
      mockPrices(10n, 0n);

      const minFee = feeCalculator.getTxFee(1, TxType.DEPOSIT);
      expect(minFee).toBe(0n);

      const txs = [mockTx(1, TxType.DEPOSIT, 1n)];
      expect(feeCalculator.computeSurplusRatio(txs)).toBe(1);
    });

    it('should compute correct surplus ratio for "Average" txs', () => {
      const fee = getTxFee(0, TxType.DEPOSIT, TestSettlementTime.AVERAGE);
      const txs = Array(10).fill(mockTx(0, TxType.DEPOSIT, fee));
      expect(feeCalculator.computeSurplusRatio(txs.slice(0, 1))).toBe(0.9);
      expect(feeCalculator.computeSurplusRatio(txs.slice(0, 2))).toBe(0.8);
      expect(feeCalculator.computeSurplusRatio(txs.slice(0, 4))).toBe(0.6);
      expect(feeCalculator.computeSurplusRatio(txs.slice(0, 7))).toBe(0.3);
      expect(feeCalculator.computeSurplusRatio(txs.slice(0, 9))).toBe(0.1);
      expect(feeCalculator.computeSurplusRatio(txs)).toBe(0);
    });

    it('should compute correct surplus ratio for "Fast" txs', () => {
      const fee = getTxFee(0, TxType.DEPOSIT, TestSettlementTime.FAST);
      const txs = Array(3).fill(mockTx(0, TxType.DEPOSIT, fee));
      expect(feeCalculator.computeSurplusRatio(txs.slice(0, 1))).toBe(0.5);
      expect(feeCalculator.computeSurplusRatio(txs.slice(0, 2))).toBe(0);
      expect(feeCalculator.computeSurplusRatio(txs)).toBe(0);
    });

    it('should compute correct surplus ratio for "INSTANT" txs', () => {
      const fee = getTxFee(0, TxType.DEPOSIT, TestSettlementTime.INSTANT);
      const txs = [mockTx(0, TxType.DEPOSIT, fee)];
      expect(feeCalculator.computeSurplusRatio(txs)).toBe(0);
    });

    it('should compute correct surplus ratio for txs with arbitrary fees', () => {
      const minFee = feeCalculator.getTxFee(0, TxType.DEPOSIT);
      const baseFee = feeCalculator.getBaseFee(0);
      const txs = [
        mockTx(0, TxType.DEPOSIT, minFee - baseFee * 2n),
        mockTx(0, TxType.DEPOSIT, minFee + baseFee * 7n),
        mockTx(0, TxType.DEPOSIT, minFee + baseFee * 3n),
      ];
      expect(feeCalculator.computeSurplusRatio(txs)).toBe(0.2);
    });

    it('should compute correct surplus ratio for token asset', () => {
      const minFee = feeCalculator.getTxFee(1, TxType.DEPOSIT);
      const baseFee = feeCalculator.getBaseFee(1);
      const txs = [mockTx(1, TxType.DEPOSIT, minFee + baseFee * 2n)];
      expect(feeCalculator.computeSurplusRatio(txs)).toBe(0.8);
    });

    it('should compute correct surplus ratio for mixed assets', () => {
      const minEthFee = feeCalculator.getTxFee(0, TxType.DEPOSIT);
      const baseEthFee = feeCalculator.getBaseFee(0);
      const minFee = feeCalculator.getTxFee(1, TxType.DEPOSIT);
      const baseFee = feeCalculator.getBaseFee(1);
      const txs = [
        mockTx(1, TxType.DEPOSIT, minFee + baseFee * 3n),
        mockTx(0, TxType.DEPOSIT, minEthFee + baseEthFee * 8n),
        mockTx(1, TxType.DEPOSIT, minFee - baseFee * 5n),
      ];
      expect(feeCalculator.computeSurplusRatio(txs)).toBe(0.4);
    });

    it('compute surplus ratio based on current fee', async () => {
      priceTracker.getMinGasPrice.mockReturnValue(1n);
      priceTracker.getMinAssetPrice.mockReturnValue(2n);

      const minEthFee = feeCalculator.getTxFee(0, TxType.DEPOSIT);
      const baseEthFee = feeCalculator.getBaseFee(0);
      const minFee = feeCalculator.getTxFee(1, TxType.DEPOSIT);
      const baseFee = feeCalculator.getBaseFee(1);
      const txs = [
        mockTx(1, TxType.DEPOSIT, minFee + baseFee * 3n),
        mockTx(0, TxType.DEPOSIT, minEthFee + baseEthFee * 8n),
        mockTx(1, TxType.DEPOSIT, minFee - baseFee * 5n),
      ];
      expect(feeCalculator.computeSurplusRatio(txs)).toBe(0.4);
    });

    it('surplus ratio should be 1 for free assets', async () => {
      const freeAssets = [1];
      feeCalculator = new FeeCalculator(
        priceTracker as any,
        assets,
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

      const txs = [mockTx(1, TxType.DEPOSIT, 100n)];
      expect(feeCalculator.computeSurplusRatio(txs)).toBe(1);
    });

    it('compute correct surplus ratio with rounded fees', async () => {
      mockPrices(12345n, 67n);
      const numSignificantFigures = 2;
      feeCalculator = new FeeCalculator(
        priceTracker as any,
        assets,
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

      const ethQuotes = feeCalculator.getFeeQuotes(0);
      const daiQuotes = feeCalculator.getFeeQuotes(1);
      const txs = [
        mockTx(
          1,
          TxType.DEPOSIT,
          daiQuotes.feeConstants[TxType.DEPOSIT] + daiQuotes.baseFeeQuotes[TestSettlementTime.AVERAGE].fee,
        ),
        mockTx(
          0,
          TxType.DEPOSIT,
          ethQuotes.feeConstants[TxType.DEPOSIT] + ethQuotes.baseFeeQuotes[TestSettlementTime.AVERAGE].fee,
        ),
        mockTx(
          1,
          TxType.DEPOSIT,
          daiQuotes.feeConstants[TxType.DEPOSIT] + daiQuotes.baseFeeQuotes[TestSettlementTime.SLOW].fee,
        ),
      ];
      expect(feeCalculator.computeSurplusRatio(txs)).toBe(0.8);
    });
  });
});

import { AssetId } from '@aztec/barretenberg/asset';
import { BlockchainAsset, TxType } from '@aztec/barretenberg/blockchain';
import { SettlementTime } from '@aztec/barretenberg/rollup_provider';
import { FeeCalculator } from './fee_calculator';
import { mockTx } from './fixtures';
import { PriceTracker } from './price_tracker';

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
  const feeFreeAssets: AssetId[] = [];
  let priceTracker: Mockify<PriceTracker>;
  let feeCalculator: FeeCalculator;

  beforeEach(() => {
    priceTracker = {
      getGasPrice: jest.fn().mockReturnValue(50n),
      getAssetPrice: jest.fn().mockImplementation((assetId: AssetId) => {
        if (assetId === AssetId.ETH) {
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
      feeFreeAssets,
    );
  });

  describe('fee quotes', () => {
    it('return correct tx fee and fee quotes', async () => {
      {
        const assetId = AssetId.ETH;
        const baseFee = 50000n;
        expect(feeCalculator.getFeeQuotes(assetId)).toEqual({
          feeConstants: [600000n, 0n, 1700n, 0n, 0n, 0n, 0n],
          baseFeeQuotes: [
            {
              fee: baseFee,
              time: publishInterval,
            },
            {
              fee: baseFee * 2n,
              time: publishInterval * 0.9,
            },
            {
              fee: baseFee * 6n,
              time: publishInterval * 0.5,
            },
            {
              fee: baseFee * 11n,
              time: 5 * 60,
            },
          ],
        });

        expect(feeCalculator.getMinTxFee(assetId, TxType.DEPOSIT)).toBe(600000n + baseFee);
        expect(feeCalculator.getMinTxFee(assetId, TxType.TRANSFER)).toBe(baseFee);
        expect(feeCalculator.getMinTxFee(assetId, TxType.WITHDRAW_TO_WALLET)).toBe(1700n + baseFee);
        expect(feeCalculator.getMinTxFee(assetId, TxType.WITHDRAW_TO_CONTRACT)).toBe(baseFee);
      }

      {
        const assetId = AssetId.DAI;
        const baseFee = 25000n;
        expect(feeCalculator.getFeeQuotes(assetId)).toEqual({
          feeConstants: [1400000n, 0n, 1950n, 0n, 0n, 0n, 0n],
          baseFeeQuotes: [
            {
              fee: baseFee,
              time: publishInterval,
            },
            {
              fee: baseFee * 2n,
              time: publishInterval * 0.9,
            },
            {
              fee: baseFee * 6n,
              time: publishInterval * 0.5,
            },
            {
              fee: baseFee * 11n,
              time: 5 * 60,
            },
          ],
        });

        expect(feeCalculator.getMinTxFee(assetId, TxType.DEPOSIT)).toBe(1400000n + baseFee);
        expect(feeCalculator.getMinTxFee(assetId, TxType.TRANSFER)).toBe(baseFee);
        expect(feeCalculator.getMinTxFee(assetId, TxType.WITHDRAW_TO_WALLET)).toBe(1950n + baseFee);
        expect(feeCalculator.getMinTxFee(assetId, TxType.WITHDRAW_TO_CONTRACT)).toBe(baseFee);
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
        feeFreeAssets,
      );

      const withMultiplier = (value: bigint) => (value * 120n) / 100n;

      {
        const assetId = AssetId.ETH;
        const baseFee = 50000n;
        expect(feeCalculator.getFeeQuotes(assetId)).toEqual({
          feeConstants: [600000n, 0n, 1700n, 0n, 0n, 0n, 0n].map(withMultiplier),
          baseFeeQuotes: [
            expect.objectContaining({ fee: withMultiplier(baseFee) }),
            expect.objectContaining({ fee: withMultiplier(baseFee * 2n) }),
            expect.objectContaining({ fee: withMultiplier(baseFee * 6n) }),
            expect.objectContaining({ fee: withMultiplier(baseFee * 11n) }),
          ],
        });
      }

      {
        const assetId = AssetId.DAI;
        const baseFee = 25000n;
        expect(feeCalculator.getFeeQuotes(assetId)).toEqual({
          feeConstants: [1400000n, 0n, 1950n, 0n, 0n, 0n, 0n].map(withMultiplier),
          baseFeeQuotes: [
            expect.objectContaining({ fee: withMultiplier(baseFee) }),
            expect.objectContaining({ fee: withMultiplier(baseFee * 2n) }),
            expect.objectContaining({ fee: withMultiplier(baseFee * 6n) }),
            expect.objectContaining({ fee: withMultiplier(baseFee * 11n) }),
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
        feeFreeAssets,
      );

      const cappedValue = (value: bigint) => value * maxFeeGasPrice;

      {
        const assetId = AssetId.ETH;
        const baseFee = BigInt(baseTxGas);
        expect(feeCalculator.getFeeQuotes(assetId)).toEqual({
          feeConstants: [12000n, 0n, 34n, 0n, 0n, 0n, 0n].map(cappedValue),
          baseFeeQuotes: [
            expect.objectContaining({ fee: cappedValue(baseFee) }),
            expect.objectContaining({ fee: cappedValue(baseFee * 2n) }),
            expect.objectContaining({ fee: cappedValue(baseFee * 6n) }),
            expect.objectContaining({ fee: cappedValue(baseFee * 11n) }),
          ],
        });
      }

      {
        const assetId = AssetId.DAI;
        const baseFee = BigInt(baseTxGas) / 2n;
        expect(feeCalculator.getFeeQuotes(assetId)).toEqual({
          feeConstants: [56000n / 2n, 0n, 78n / 2n, 0n, 0n, 0n, 0n].map(cappedValue),
          baseFeeQuotes: [
            expect.objectContaining({ fee: cappedValue(baseFee) }),
            expect.objectContaining({ fee: cappedValue(baseFee * 2n) }),
            expect.objectContaining({ fee: cappedValue(baseFee * 6n) }),
            expect.objectContaining({ fee: cappedValue(baseFee * 11n) }),
          ],
        });
      }
    });

    it('return correct tx fee and fee quotes for asset with decimals', async () => {
      priceTracker.getAssetPrice.mockReturnValue(1n);

      const assets = [
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
        feeFreeAssets,
      );

      const withDecimals = (value: bigint) => value * 10n ** 8n;

      {
        const assetId = 0;
        const baseFee = 50000n;
        expect(feeCalculator.getFeeQuotes(assetId)).toEqual({
          feeConstants: [600n, 0n, 1700n, 0n, 0n, 0n, 0n].map(withDecimals),
          baseFeeQuotes: [
            expect.objectContaining({ fee: withDecimals(baseFee) }),
            expect.objectContaining({ fee: withDecimals(baseFee * 2n) }),
            expect.objectContaining({ fee: withDecimals(baseFee * 6n) }),
            expect.objectContaining({ fee: withDecimals(baseFee * 11n) }),
          ],
        });
      }
    });

    it('return zero fees for free asset', async () => {
      const feeFreeAssets = [AssetId.DAI];
      feeCalculator = new FeeCalculator(
        priceTracker as any,
        assets,
        baseTxGas,
        maxFeeGasPrice,
        feeGasPriceMultiplier,
        txsPerRollup,
        publishInterval,
        surplusRatios,
        feeFreeAssets,
      );

      {
        const assetId = AssetId.DAI;
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
        feeFreeAssets,
      );

      expect(feeCalculator.getFeeQuotes(AssetId.ETH).baseFeeQuotes).toEqual([
        expect.objectContaining({ time: 5 * 60 + 1 }),
        expect.objectContaining({ time: 5 * 60 }),
        expect.objectContaining({ time: 5 * 60 }),
        expect.objectContaining({ time: 5 * 60 }),
      ]);
    });
  });

  describe('surplus ratio', () => {
    const float = (value: number) => +value.toFixed(2); // deal with float precision

    const getTxFee = (assetId: number, txType: TxType, speed: SettlementTime) => {
      const { feeConstants, baseFeeQuotes } = feeCalculator.getFeeQuotes(assetId);
      return feeConstants[txType] + baseFeeQuotes[speed].fee;
    };

    it('should compute correct surplus ratio for different settlement time', () => {
      [SettlementTime.SLOW, SettlementTime.AVERAGE, SettlementTime.FAST, SettlementTime.INSTANT].forEach(speed => {
        const fee = getTxFee(AssetId.ETH, TxType.DEPOSIT, speed);
        const txs = [mockTx(AssetId.ETH, TxType.DEPOSIT, fee)];
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
        const fee = feeCalculator.getMinTxFee(AssetId.ETH, txType);
        const txs = [mockTx(AssetId.ETH, TxType.DEPOSIT, fee)];
        expect(feeCalculator.computeSurplusRatio(txs)).toBe(1);
      });
    });

    it('surplus ratio should never be negative', () => {
      const minFee = feeCalculator.getMinTxFee(AssetId.ETH, TxType.DEPOSIT);
      const baseFee = feeCalculator.getFeeQuotes(AssetId.ETH).baseFeeQuotes[SettlementTime.SLOW].fee;
      const txs = [mockTx(AssetId.ETH, TxType.DEPOSIT, minFee + baseFee * 100n)];
      expect(feeCalculator.computeSurplusRatio(txs)).toBe(0);
    });

    it('surplus ratio should never be larger than 1 ', () => {
      const minFee = feeCalculator.getMinTxFee(AssetId.ETH, TxType.DEPOSIT);
      const baseFee = feeCalculator.getFeeQuotes(AssetId.ETH).baseFeeQuotes[SettlementTime.SLOW].fee;
      const txs = [mockTx(AssetId.ETH, TxType.DEPOSIT, minFee - baseFee)]; // insufficient fee, feeSurplus is negative
      expect(feeCalculator.computeSurplusRatio(txs)).toBe(1);
    });

    it('surplus ratio should be 1 if base fee is zero', async () => {
      priceTracker.getGasPrice.mockReturnValue(0n);

      const minFee = feeCalculator.getMinTxFee(AssetId.ETH, TxType.DEPOSIT);
      expect(minFee).toBe(0n);

      const ethTxs = [mockTx(AssetId.ETH, TxType.DEPOSIT, 1n)];
      expect(feeCalculator.computeSurplusRatio(ethTxs)).toBe(1);

      const daiTxs = [mockTx(AssetId.DAI, TxType.DEPOSIT, 1n)];
      expect(feeCalculator.computeSurplusRatio(daiTxs)).toBe(1);
    });

    it('surplus ratio should be 1 if asset price is zero', async () => {
      priceTracker.getAssetPrice.mockReturnValue(0n);

      const minFee = feeCalculator.getMinTxFee(AssetId.DAI, TxType.DEPOSIT);
      expect(minFee).toBe(0n);

      const txs = [mockTx(AssetId.DAI, TxType.DEPOSIT, 1n)];
      expect(feeCalculator.computeSurplusRatio(txs)).toBe(1);
    });

    it('should compute correct surplus ratio for "Average" txs', () => {
      const fee = getTxFee(AssetId.ETH, TxType.DEPOSIT, SettlementTime.AVERAGE);
      const txs = Array(10).fill(mockTx(AssetId.ETH, TxType.DEPOSIT, fee));
      expect(float(feeCalculator.computeSurplusRatio(txs.slice(0, 1)))).toBe(0.9);
      expect(float(feeCalculator.computeSurplusRatio(txs.slice(0, 2)))).toBe(0.8);
      expect(float(feeCalculator.computeSurplusRatio(txs.slice(0, 4)))).toBe(0.6);
      expect(float(feeCalculator.computeSurplusRatio(txs.slice(0, 7)))).toBe(0.3);
      expect(float(feeCalculator.computeSurplusRatio(txs.slice(0, 9)))).toBe(0.1);
      expect(float(feeCalculator.computeSurplusRatio(txs))).toBe(0);
    });

    it('should compute correct surplus ratio for "Fast" txs', () => {
      const fee = getTxFee(AssetId.ETH, TxType.DEPOSIT, SettlementTime.FAST);
      const txs = Array(3).fill(mockTx(AssetId.ETH, TxType.DEPOSIT, fee));
      expect(feeCalculator.computeSurplusRatio(txs.slice(0, 1))).toBe(0.5);
      expect(feeCalculator.computeSurplusRatio(txs.slice(0, 2))).toBe(0);
      expect(feeCalculator.computeSurplusRatio(txs)).toBe(0);
    });

    it('should compute correct surplus ratio for "INSTANT" txs', () => {
      const fee = getTxFee(AssetId.ETH, TxType.DEPOSIT, SettlementTime.INSTANT);
      const txs = [mockTx(AssetId.ETH, TxType.DEPOSIT, fee)];
      expect(feeCalculator.computeSurplusRatio(txs)).toBe(0);
    });

    it('should compute correct surplus ratio for txs with arbitrary fees', () => {
      const minFee = feeCalculator.getMinTxFee(AssetId.ETH, TxType.DEPOSIT);
      const baseFee = feeCalculator.getFeeQuotes(AssetId.ETH).baseFeeQuotes[SettlementTime.SLOW].fee;
      const txs = [
        mockTx(AssetId.ETH, TxType.DEPOSIT, minFee - baseFee * 2n),
        mockTx(AssetId.ETH, TxType.DEPOSIT, minFee + baseFee * 7n),
        mockTx(AssetId.ETH, TxType.DEPOSIT, minFee + baseFee * 3n),
      ];
      expect(float(feeCalculator.computeSurplusRatio(txs))).toBe(0.2);
    });

    it('should compute correct surplus ratio for token asset', () => {
      const minFee = feeCalculator.getMinTxFee(AssetId.DAI, TxType.DEPOSIT);
      const baseFee = feeCalculator.getFeeQuotes(AssetId.DAI).baseFeeQuotes[SettlementTime.SLOW].fee;
      const txs = [mockTx(AssetId.DAI, TxType.DEPOSIT, minFee + baseFee * 2n)];
      expect(float(feeCalculator.computeSurplusRatio(txs))).toBe(0.8);
    });

    it('should compute correct surplus ratio for mixed assets', () => {
      const minEthFee = feeCalculator.getMinTxFee(AssetId.ETH, TxType.DEPOSIT);
      const baseEthFee = feeCalculator.getFeeQuotes(AssetId.ETH).baseFeeQuotes[SettlementTime.SLOW].fee;
      const minFee = feeCalculator.getMinTxFee(AssetId.DAI, TxType.DEPOSIT);
      const baseFee = feeCalculator.getFeeQuotes(AssetId.DAI).baseFeeQuotes[SettlementTime.SLOW].fee;
      const txs = [
        mockTx(AssetId.DAI, TxType.DEPOSIT, minFee + baseFee * 3n),
        mockTx(AssetId.ETH, TxType.DEPOSIT, minEthFee + baseEthFee * 8n),
        mockTx(AssetId.DAI, TxType.DEPOSIT, minFee - baseFee * 5n),
      ];
      expect(float(feeCalculator.computeSurplusRatio(txs))).toBe(0.4);
    });

    it('surplus ratio should be 1 for free assets', async () => {
      const feeFreeAssets = [AssetId.DAI];
      feeCalculator = new FeeCalculator(
        priceTracker as any,
        assets,
        baseTxGas,
        maxFeeGasPrice,
        feeGasPriceMultiplier,
        txsPerRollup,
        publishInterval,
        surplusRatios,
        feeFreeAssets,
      );

      const txs = [mockTx(AssetId.DAI, TxType.DEPOSIT, 100n)];
      expect(feeCalculator.computeSurplusRatio(txs)).toBe(1);
    });
  });
});

import { BlockchainAsset, TxType, Blockchain } from '@aztec/barretenberg/blockchain';
import { FeeCalculator } from './fee_calculator';
import { PriceTracker } from './price_tracker';
import { getGasOverhead } from './get_gas_overhead';

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
      gasLimit: 60000,
    },
  ] as BlockchainAsset[];
  const verificationGas = 100000;
  const maxFeeGasPrice = 0n;
  const feeGasPriceMultiplier = 1;
  const txsPerRollup = 10;
  const numSignificantFigures = 0;
  const callDataPerRollup = 128 * 1024;
  let priceTracker: Mockify<PriceTracker>;
  let blockchain: Mockify<Blockchain>;
  let feeCalculator: FeeCalculator;

  const getGasOverheadForTxType = (assetId: number, txType: TxType) => getGasOverhead(txType, assets[assetId].gasLimit);

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
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

    blockchain = {
      getBlockchainStatus: jest.fn().mockReturnValue({
        assets,
      }),
    } as any;

    feeCalculator = new FeeCalculator(
      priceTracker as any,
      blockchain,
      verificationGas,
      maxFeeGasPrice,
      feeGasPriceMultiplier,
      txsPerRollup,
      callDataPerRollup,
      numSignificantFigures,
    );
  });

  it('return correct min fees', async () => {
    expect(feeCalculator.getMinTxFee(0, TxType.DEPOSIT, 0)).toBe(1483400n);
    expect(feeCalculator.getMinTxFee(1, TxType.DEPOSIT, 1)).toBe(741700n);
  });

  it('returns the correct base gas values', async () => {
    const adjustedBaseGas = feeCalculator.getAdjustedBaseVerificationGas(TxType.DEPOSIT);
    const unadjustedBaseGas = feeCalculator.getUnadjustedBaseVerificationGas();
    const adjustmentValue = feeCalculator.getTxGasAdjustmentValue(TxType.DEPOSIT);
    expect(adjustmentValue).toBe(0);
    expect(unadjustedBaseGas).toBe(Math.ceil(verificationGas / txsPerRollup));
    expect(adjustedBaseGas).toBe(unadjustedBaseGas);
    expect(adjustedBaseGas - unadjustedBaseGas).toBe(0);
  });

  it('returns correct gas for an empty rollup slot', async () => {
    const verificationGasValues = [1000000, 5000000, 2500000];
    const txsPerRollupValues = [10, 28, 112, 896];
    for (const vGas of verificationGasValues) {
      for (const txs of txsPerRollupValues) {
        feeCalculator = new FeeCalculator(
          priceTracker as any,
          blockchain,
          vGas,
          maxFeeGasPrice,
          feeGasPriceMultiplier,
          txs,
          callDataPerRollup,
          numSignificantFigures,
        );
        expect(feeCalculator.getUnadjustedBaseVerificationGas()).toBe(Math.ceil(vGas / txs));
      }
    }
  });

  it('returns correct adjusted gas', async () => {
    const newTxsPerRollup = 896;
    feeCalculator = new FeeCalculator(
      priceTracker as any,
      blockchain,
      verificationGas,
      maxFeeGasPrice,
      feeGasPriceMultiplier,
      newTxsPerRollup,
      callDataPerRollup,
      numSignificantFigures,
    );
    // call data per rollup above is 128 * 1024
    // verification gas above is 100000
    // call data size of deposits is 281 so a maximum of 465 deposits can fit into a rollup based on call data, this is less than the 896 slots available
    // call data size of transfers is 129 so a maximum of 1016 txs can fit into a rollup based on call data, but this is more than the 896 slots available
    // adjustment values should be:
    // for DEPOSIT
    // unadjusted = 100000 / 896 = 111.607...
    // adjusted = 100000 / 465 = 215.053...
    // adjustment value = Math.ceil(adjusted - unadjusted) == 104
    //const expectedDepositUnadjusted = 100000 / 896;
    //const expectedDepositAdjusted = 100000 / 508;
    //const expectedDepositAdjustment = Math.ceil(100000 / 465 - 100000 / 896);

    // final values
    // unadjusted = Math.ceil(100000 / 896) = 112;
    // adjusted = unadjusted + adjustment = 112 + 104 = 216
    expect(feeCalculator.getTxGasAdjustmentValue(TxType.DEPOSIT)).toBe(104);
    expect(feeCalculator.getAdjustedBaseVerificationGas(TxType.DEPOSIT)).toBe(216);
    expect(
      feeCalculator.getAdjustedBaseVerificationGas(TxType.DEPOSIT) - feeCalculator.getUnadjustedBaseVerificationGas(),
    ).toBe(104);

    // full tx gas value for DEPOSIT
    // tx gas = adjusted base gas + tx overhead gas
    const expectedDepositFullAdjustedGasAsset0 = 216 + getGasOverheadForTxType(0, TxType.DEPOSIT);
    expect(feeCalculator.getAdjustedTxGas(0, TxType.DEPOSIT)).toBe(expectedDepositFullAdjustedGasAsset0);
    expect(
      feeCalculator.getAdjustedTxGas(0, TxType.DEPOSIT) - feeCalculator.getUnadjustedTxGas(0, TxType.DEPOSIT),
    ).toBe(104);
    const expectedDepositFullAdjustedGasAsset1 = 216 + getGasOverheadForTxType(1, TxType.DEPOSIT);
    expect(feeCalculator.getAdjustedTxGas(1, TxType.DEPOSIT)).toBe(expectedDepositFullAdjustedGasAsset1);
    expect(
      feeCalculator.getAdjustedTxGas(1, TxType.DEPOSIT) - feeCalculator.getUnadjustedTxGas(1, TxType.DEPOSIT),
    ).toBe(104);

    // for TRANSFER
    // unadjusted = 100000 / 896 = 111.607...
    // adjusted = 100000 / 896 = 111.607...
    // adjustment value = Math.ceil(adjusted - unadjusted) == 0;
    //const expectedTransferUnadjusted = 100000 / 896;
    //const expectedTransferAdjusted = 100000 / 896;
    //const expetcedTransferAdjustment = 0;

    // final values
    // unadjusted = Math.ceil(100000 / 896) = 112;
    // adjusted = unadjusted + adjustment = 112 + 0 = 112
    expect(feeCalculator.getTxGasAdjustmentValue(TxType.TRANSFER)).toBe(0);
    expect(feeCalculator.getAdjustedBaseVerificationGas(TxType.TRANSFER)).toBe(112);
    expect(
      feeCalculator.getAdjustedBaseVerificationGas(TxType.TRANSFER) - feeCalculator.getUnadjustedBaseVerificationGas(),
    ).toBe(0);

    // full tx gas value for TRANSFER
    // tx gas = adjusted base gas + tx overhead gas
    const expectedTransferFullAdjustedGasAsset0 = 112 + getGasOverheadForTxType(0, TxType.TRANSFER);
    expect(feeCalculator.getAdjustedTxGas(0, TxType.TRANSFER)).toBe(expectedTransferFullAdjustedGasAsset0);
    expect(
      feeCalculator.getAdjustedTxGas(0, TxType.TRANSFER) - feeCalculator.getUnadjustedTxGas(0, TxType.TRANSFER),
    ).toBe(0);
    const expectedTransferFullAdjustedGasAsset1 = 112 + getGasOverheadForTxType(1, TxType.TRANSFER);
    expect(feeCalculator.getAdjustedTxGas(1, TxType.TRANSFER)).toBe(expectedTransferFullAdjustedGasAsset1);
    expect(
      feeCalculator.getAdjustedTxGas(1, TxType.TRANSFER) - feeCalculator.getUnadjustedTxGas(1, TxType.TRANSFER),
    ).toBe(0);
  });
});

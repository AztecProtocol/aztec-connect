import { BlockchainAsset, TxType, Blockchain } from '@aztec/barretenberg/blockchain';
import { FeeCalculator } from './fee_calculator.js';
import { PriceTracker } from './price_tracker.js';
import { getGasOverhead, getTxCallData } from './get_gas_overhead.js';
import { jest } from '@jest/globals';

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

describe('fee calculator', () => {
  const assets = [
    {
      decimals: 18,
      gasLimit: 30000,
      symbol: 'ETH',
    },
    {
      decimals: 0,
      gasLimit: 60000,
      symbol: 'DAI',
    },
  ] as BlockchainAsset[];
  const verificationGas = 100000;
  const maxFeeGasPrice = 0n;
  const feeGasPriceMultiplier = 1;
  const txsPerRollup = 10;
  const numSignificantFigures = 0;
  const callDataPerRollup = 128 * 1024;
  const gasLimitPerRollup = 12000000;
  let exitOnly: boolean;
  let priceTracker: Mockify<PriceTracker>;
  let blockchain: Mockify<Blockchain>;
  let feeCalculator: FeeCalculator;
  let exitOnlyFeeCalculator: FeeCalculator;

  const getGasOverheadForTxType = (assetId: number, txType: TxType) => {
    const assetGasLimit = { assetId, gasLimit: assets[assetId].gasLimit };
    return getGasOverhead(txType, assetGasLimit);
  };

  beforeEach(() => {
    exitOnly = false;
    jest.spyOn(console, 'log').mockImplementation(() => {});
    priceTracker = {
      getGasPrice: jest.fn().mockReturnValue(100n),
      getAssetPrice: jest.fn((assetId: number) => {
        if (assetId === 0) {
          return 10n ** 18n;
        }
        return 2n;
      }),
      getMinGasPrice: jest.fn().mockReturnValue(50n),
      getMinAssetPrice: jest.fn((assetId: number) => {
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
      gasLimitPerRollup,
      numSignificantFigures,
      exitOnly,
    );
  });

  it('returns the correct base gas values', () => {
    const adjustedBaseGas = feeCalculator.getAdjustedBaseVerificationGas(0, TxType.DEPOSIT);
    const unadjustedBaseGas = feeCalculator.getUnadjustedBaseVerificationGas();
    const adjustmentValue = feeCalculator.getTxGasAdjustmentValue(0, TxType.DEPOSIT);
    expect(adjustmentValue).toBe(0);
    expect(unadjustedBaseGas).toBe(Math.ceil(verificationGas / txsPerRollup));
    expect(adjustedBaseGas).toBe(unadjustedBaseGas);
    expect(adjustedBaseGas - unadjustedBaseGas).toBe(0);
  });

  it('returns the correct max call data value', () => {
    // a deposit uses the most call data
    const expectedMaxCallData = getTxCallData(TxType.DEPOSIT);
    expect(feeCalculator.getMaxTxCallData()).toBe(expectedMaxCallData);
  });

  it('returns the correct max gas value', () => {
    // a withdraw tx for the second asset (DAI) will use the most gas
    const unadjustedBaseGas = Math.ceil(verificationGas / txsPerRollup);
    const txGasOverhead = getGasOverheadForTxType(1, TxType.WITHDRAW_HIGH_GAS);
    const expectedMaxGas = unadjustedBaseGas + txGasOverhead;
    expect(feeCalculator.getMaxUnadjustedGas()).toBe(expectedMaxGas);
  });

  it('returns correct gas for an empty rollup slot', () => {
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
          gasLimitPerRollup,
          numSignificantFigures,
          exitOnly,
        );
        expect(feeCalculator.getUnadjustedBaseVerificationGas()).toBe(Math.ceil(vGas / txs));
      }
    }
  });

  it('returns correct adjusted gas', () => {
    const newTxsPerRollup = 896;
    feeCalculator = new FeeCalculator(
      priceTracker as any,
      blockchain,
      verificationGas,
      maxFeeGasPrice,
      feeGasPriceMultiplier,
      newTxsPerRollup,
      callDataPerRollup,
      gasLimitPerRollup,
      numSignificantFigures,
      exitOnly,
    );
    // call data per rollup above is 128 * 1024
    // gas limit per rollup above is 12000000
    // verification gas above is 100000
    // call data size of deposits is 281 so a maximum of 465 deposits can fit into a rollup based on call data, this is less than the 896 slots available
    // call data size of transfers is 129 so a maximum of 1016 txs can fit into a rollup based on call data, but this is more than the 896 slots available
    // call data size of withdraw_to_wallet is 185 so a maximum of 707 txs can fit into a rollup on call data. the same is true for withdraw_high_gas
    // however, there are further limitations for these txs because of the gas limit per rollup
    // the asset gas limits configured above are 30000 for eth and 60000 for asset 1 (Dai)
    // the wallet withdraw gas value for eth is 10000
    // for eth:
    // withdraw_to_wallet consumes 17632 (including the 10000 withdraw gas for eth)
    // withdraw_high_gas consumes 47632 (including the 30000 gas limit and 10000 gas value for eth withdraws)
    // for dai:
    // withdraw_to_wallet consumes 67632 (including the 60000 gas limit)
    // withdraw_high_gas consumes 67632 (including the 60000 gas limit)

    // calculations for determining the number of txs that can fit into the rollup first reduce the available resource by
    // a worst case consumer of that resource e.g. for call data
    // the worst case consumer is a DEPOSIT at 281 bytes
    // if the call data limit is 131072 then we adjust this down by 281 before dividing by the amount of call data
    // consumed by the tx
    // so fo a TRANSFER which consumes 129 bytes of call data the num possible txs based on call data is
    // ((131072 - 281) / 129) = 1013 (floored as you can't have a partial tx)

    // for gas the worst case is a withdrawal for an ERC20 token with a high gas limit
    // e.g. for a withdrawal to wallet with a gas limit of 60000 the gas required is 67744
    // if the rollup gas limit is 12,000,000 and the verification gas is 500,000 then we need to
    // calculate the gas available for txs = 12,000,000 - 500,000 = 11,500,000
    // then subtract the worst case gas consumer (67744)
    // 11,500,000 - 67744 = 11,432,256
    // now we calculate the max number of txs by dividing this by the gas required for that tx
    // e.g. for a transfer 11,432,256 / 6842 = 1670

    // adjustment values should be:
    // for DEPOSIT
    // unadjusted = 100000 / 896 = 111.607...
    // adjusted = 100000 / 465 = 215.053...
    // adjustment value = Math.ceil(adjusted - unadjusted) = 104

    // final values
    // unadjusted = Math.ceil(100000 / 896) = 112;
    // adjusted = unadjusted + adjustment = 112 + 104 = 216
    {
      const adjustmentValue = 104;
      const adjustedBaseGas = 216;
      expect(feeCalculator.getTxGasAdjustmentValue(0, TxType.DEPOSIT)).toBe(adjustmentValue);
      expect(feeCalculator.getAdjustedBaseVerificationGas(0, TxType.DEPOSIT)).toBe(adjustedBaseGas);
      expect(
        feeCalculator.getAdjustedBaseVerificationGas(0, TxType.DEPOSIT) -
          feeCalculator.getUnadjustedBaseVerificationGas(),
      ).toBe(adjustmentValue);

      // full tx gas value for DEPOSIT
      // tx gas = adjusted base gas + tx overhead gas
      const expectedDepositFullAdjustedGasAsset0 = adjustedBaseGas + getGasOverheadForTxType(0, TxType.DEPOSIT);
      expect(feeCalculator.getAdjustedTxGas(0, TxType.DEPOSIT)).toBe(expectedDepositFullAdjustedGasAsset0);
      expect(
        feeCalculator.getAdjustedTxGas(0, TxType.DEPOSIT) - feeCalculator.getUnadjustedTxGas(0, TxType.DEPOSIT),
      ).toBe(adjustmentValue);
      const expectedDepositFullAdjustedGasAsset1 = adjustedBaseGas + getGasOverheadForTxType(1, TxType.DEPOSIT);
      expect(feeCalculator.getAdjustedTxGas(1, TxType.DEPOSIT)).toBe(expectedDepositFullAdjustedGasAsset1);
      expect(
        feeCalculator.getAdjustedTxGas(1, TxType.DEPOSIT) - feeCalculator.getUnadjustedTxGas(1, TxType.DEPOSIT),
      ).toBe(adjustmentValue);
    }

    {
      // for TRANSFER
      // unadjusted = 100000 / 896 = 111.607...
      // adjusted = 100000 / 896 = 111.607...
      // adjustment value = Math.ceil(adjusted - unadjusted) = 0;

      // final values
      // unadjusted = Math.ceil(100000 / 896) = 112;
      // adjusted = unadjusted + adjustment = 112 + 0 = 112
      const adjustmentValue = 0;
      const adjustedBaseGas = 112;
      expect(feeCalculator.getTxGasAdjustmentValue(0, TxType.TRANSFER)).toBe(adjustmentValue);
      expect(feeCalculator.getAdjustedBaseVerificationGas(0, TxType.TRANSFER)).toBe(adjustedBaseGas);
      expect(
        feeCalculator.getAdjustedBaseVerificationGas(0, TxType.TRANSFER) -
          feeCalculator.getUnadjustedBaseVerificationGas(),
      ).toBe(adjustmentValue);

      // full tx gas value for TRANSFER
      // tx gas = adjusted base gas + tx overhead gas
      const expectedTransferFullAdjustedGasAsset0 = adjustedBaseGas + getGasOverheadForTxType(0, TxType.TRANSFER);
      expect(feeCalculator.getAdjustedTxGas(0, TxType.TRANSFER)).toBe(expectedTransferFullAdjustedGasAsset0);
      expect(
        feeCalculator.getAdjustedTxGas(0, TxType.TRANSFER) - feeCalculator.getUnadjustedTxGas(0, TxType.TRANSFER),
      ).toBe(adjustmentValue);
      const expectedTransferFullAdjustedGasAsset1 = adjustedBaseGas + getGasOverheadForTxType(1, TxType.TRANSFER);
      expect(feeCalculator.getAdjustedTxGas(1, TxType.TRANSFER)).toBe(expectedTransferFullAdjustedGasAsset1);
      expect(
        feeCalculator.getAdjustedTxGas(1, TxType.TRANSFER) - feeCalculator.getUnadjustedTxGas(1, TxType.TRANSFER),
      ).toBe(adjustmentValue);
    }

    // for WITHDRAW_TO_WALLET
    // for eth
    // tx limit based on the rollup gas limit = (((12000000 - 100000) - 67744) / 17632) = 671
    // tx limit based on calldata = ((131072 - 281) / 185) = 706 so the gas limit is the limiting factor
    // unadjusted = 100000 / 896 = 111.607...
    // adjusted = 100000 / 671 = 149.031...
    // adjustment value = Math.ceil(adjusted - unadjusted) = 38;

    // final values
    // unadjusted = Math.ceil(100000 / 896) = 112;
    // adjusted = unadjusted + adjustment = 112 + 38 = 150
    {
      const adjustmentValue = 38;
      const adjustedBaseGas = 150;
      expect(feeCalculator.getTxGasAdjustmentValue(0, TxType.WITHDRAW_TO_WALLET)).toBe(adjustmentValue);
      expect(feeCalculator.getAdjustedBaseVerificationGas(0, TxType.WITHDRAW_TO_WALLET)).toBe(adjustedBaseGas);
      expect(
        feeCalculator.getAdjustedBaseVerificationGas(0, TxType.WITHDRAW_TO_WALLET) -
          feeCalculator.getUnadjustedBaseVerificationGas(),
      ).toBe(adjustmentValue);

      // full tx gas value for WITHDRAW_TO_WALLET for eth
      // tx gas = adjusted base gas + tx overhead gas
      const expectedFullAdjustedGas = adjustedBaseGas + getGasOverheadForTxType(0, TxType.WITHDRAW_TO_WALLET);
      expect(feeCalculator.getAdjustedTxGas(0, TxType.WITHDRAW_TO_WALLET)).toBe(expectedFullAdjustedGas);
      expect(
        feeCalculator.getAdjustedTxGas(0, TxType.WITHDRAW_TO_WALLET) -
          feeCalculator.getUnadjustedTxGas(0, TxType.WITHDRAW_TO_WALLET),
      ).toBe(adjustmentValue);
    }

    {
      // for dai
      // tx limit based on the rollup gas limit = (((12000000 - 100000) - 67744) / 67632) = 174
      // tx limit based on calldata = ((131072 - 281) / 185) = 706 so this is not the limiting factor here
      // unadjusted = 100000 / 896 = 111.607...
      // adjusted = 100000 / 174 = 574.712...
      // adjustment value = Math.ceil(adjusted - unadjusted) == 464
      // final values
      // unadjusted = Math.ceil(100000 / 896) = 112;
      // adjusted = unadjusted + adjustment = 112 + 464 = 576
      const adjustmentValue = 464;
      const adjustedBaseGas = 576;
      expect(feeCalculator.getTxGasAdjustmentValue(1, TxType.WITHDRAW_TO_WALLET)).toBe(adjustmentValue);
      expect(feeCalculator.getAdjustedBaseVerificationGas(1, TxType.WITHDRAW_TO_WALLET)).toBe(adjustedBaseGas);
      expect(
        feeCalculator.getAdjustedBaseVerificationGas(1, TxType.WITHDRAW_TO_WALLET) -
          feeCalculator.getUnadjustedBaseVerificationGas(),
      ).toBe(adjustmentValue);
      const expectedFullAdjustedGas = adjustedBaseGas + getGasOverheadForTxType(1, TxType.WITHDRAW_TO_WALLET);
      expect(feeCalculator.getAdjustedTxGas(1, TxType.WITHDRAW_TO_WALLET)).toBe(expectedFullAdjustedGas);
      expect(
        feeCalculator.getAdjustedTxGas(1, TxType.WITHDRAW_TO_WALLET) -
          feeCalculator.getUnadjustedTxGas(1, TxType.WITHDRAW_TO_WALLET),
      ).toBe(adjustmentValue);
    }

    {
      // for WITHDRAW_HIGH_GAS
      // for eth
      // tx limit based on the rollup gas limit = (((12000000 - 100000) - 67744) / 47632) = 248
      // tx limit based on calldata = ((131072 - 281) / 185) = 707 so this is not the limiting factor here
      // unadjusted = 100000 / 896 = 111.607...
      // adjusted = 100000 / 248 = 403.225..
      // adjustment value = Math.ceil(adjusted - unadjusted) = 292
      // final values
      // unadjusted = Math.ceil(100000 / 896) = 112;
      // adjusted = unadjusted + adjustment = 112 + 292 = 319
      const adjustmentValue = 292;
      const adjustedBaseGas = 404;
      expect(feeCalculator.getTxGasAdjustmentValue(0, TxType.WITHDRAW_HIGH_GAS)).toBe(adjustmentValue);
      expect(feeCalculator.getAdjustedBaseVerificationGas(0, TxType.WITHDRAW_HIGH_GAS)).toBe(adjustedBaseGas);
      expect(
        feeCalculator.getAdjustedBaseVerificationGas(0, TxType.WITHDRAW_HIGH_GAS) -
          feeCalculator.getUnadjustedBaseVerificationGas(),
      ).toBe(adjustmentValue);
      const expectedFullAdjustedGas = adjustedBaseGas + getGasOverheadForTxType(0, TxType.WITHDRAW_HIGH_GAS);
      expect(feeCalculator.getAdjustedTxGas(0, TxType.WITHDRAW_HIGH_GAS)).toBe(expectedFullAdjustedGas);
      expect(
        feeCalculator.getAdjustedTxGas(0, TxType.WITHDRAW_HIGH_GAS) -
          feeCalculator.getUnadjustedTxGas(0, TxType.WITHDRAW_HIGH_GAS),
      ).toBe(adjustmentValue);
    }

    {
      // for dai
      // tx limit based on the rollup gas limit = (((12000000 - 100000) - 67744) / 67632) = 174
      // tx limit based on calldata = ((131072 - 281) / 185) = 706 so this is not the limiting factor here
      // unadjusted = 100000 / 896 = 111.607...
      // adjusted = 100000 / 174 = 574.712...
      // adjustment value = Math.ceil(adjusted - unadjusted) == 464
      // final values
      // unadjusted = Math.ceil(100000 / 896) = 112;
      // adjusted = unadjusted + adjustment = 112 + 464 = 576
      const adjustmentValue = 464;
      const adjustedBaseGas = 576;
      expect(feeCalculator.getTxGasAdjustmentValue(1, TxType.WITHDRAW_HIGH_GAS)).toBe(adjustmentValue);
      expect(feeCalculator.getAdjustedBaseVerificationGas(1, TxType.WITHDRAW_HIGH_GAS)).toBe(adjustedBaseGas);
      expect(
        feeCalculator.getAdjustedBaseVerificationGas(1, TxType.WITHDRAW_HIGH_GAS) -
          feeCalculator.getUnadjustedBaseVerificationGas(),
      ).toBe(adjustmentValue);
      const expectedFullAdjustedGas = adjustedBaseGas + getGasOverheadForTxType(1, TxType.WITHDRAW_HIGH_GAS);
      expect(feeCalculator.getAdjustedTxGas(1, TxType.WITHDRAW_HIGH_GAS)).toBe(expectedFullAdjustedGas);
      expect(
        feeCalculator.getAdjustedTxGas(1, TxType.WITHDRAW_HIGH_GAS) -
          feeCalculator.getUnadjustedTxGas(1, TxType.WITHDRAW_HIGH_GAS),
      ).toBe(adjustmentValue);
    }
  });

  it('returns correct fees for exit-only mode', () => {
    exitOnly = true;
    exitOnlyFeeCalculator = new FeeCalculator(
      priceTracker as any,
      blockchain,
      verificationGas,
      maxFeeGasPrice,
      feeGasPriceMultiplier,
      txsPerRollup,
      callDataPerRollup,
      gasLimitPerRollup,
      numSignificantFigures,
      exitOnly,
    );
    const zeroArray = new Array(7).fill(0n);
    let fees = exitOnlyFeeCalculator.getTxFees(0, 0);
    expect(fees.map(val => val[0].value)).toEqual(zeroArray);
    expect(fees.map(val => val[1].value)).not.toEqual(zeroArray);
    fees = exitOnlyFeeCalculator.getTxFees(1, 0);
    expect(fees.map(val => val[0].value)).toEqual(zeroArray);
    expect(fees.map(val => val[1].value)).not.toEqual(zeroArray);

    fees = exitOnlyFeeCalculator.getTxFees(1, 1);
    expect(fees.map(val => val[0].value)).toEqual(zeroArray);
    expect(fees.map(val => val[1].value)).not.toEqual(zeroArray);

    fees = exitOnlyFeeCalculator.getTxFees(0, 1);
    expect(fees.map(val => val[0].value)).toEqual(zeroArray);
    expect(fees.map(val => val[1].value)).not.toEqual(zeroArray);
  });
});

import { BlockchainAsset, TxType } from '@aztec/barretenberg/blockchain';
import {
  OffchainAccountData,
  OffchainDefiClaimData,
  OffchainDefiDepositData,
  OffchainJoinSplitData,
} from '@aztec/barretenberg/offchain_tx_data';
import {
  RollupAccountProofData,
  RollupDefiClaimProofData,
  RollupDefiDepositProofData,
  RollupDepositProofData,
  RollupSendProofData,
  RollupWithdrawProofData,
} from '@aztec/barretenberg/rollup_proof';
import { PriceTracker } from './price_tracker';
import { roundUp } from './round_up';

export class FeeCalculator {
  constructor(
    private readonly priceTracker: PriceTracker,
    private readonly assets: BlockchainAsset[],
    private readonly verificationGas: number,
    private readonly maxFeeGasPrice: bigint,
    private readonly feeGasPriceMultiplier: number,
    private readonly txsPerRollup: number,
    private readonly numSignificantFigures = 0,
  ) {}

  public getMinTxFee(assetId: number, txType: TxType) {
    return this.getFeeConstant(assetId, txType, true) + this.getBaseFee(assetId, true);
  }

  public getTxFees(assetId: number) {
    const baseFee = this.getBaseFee(assetId);
    return [
      TxType.DEPOSIT,
      TxType.TRANSFER,
      TxType.WITHDRAW_TO_WALLET,
      TxType.WITHDRAW_TO_CONTRACT,
      TxType.ACCOUNT,
      TxType.DEFI_DEPOSIT,
      TxType.DEFI_CLAIM,
    ].map(txType => [
      { assetId, value: baseFee + this.getFeeConstant(assetId, txType) },
      { assetId, value: baseFee * BigInt(this.txsPerRollup) + this.getFeeConstant(assetId, txType) },
    ]);
  }

  public getTxFeeFromGas(gas: number, assetId: number) {
    return this.toAssetPrice(assetId, gas, false);
  }

  public getGasPaidForByFee(assetId: number, fee: bigint) {
    const assetCostInWei = this.priceTracker.getAssetPrice(assetId);
    // Our feeGasPriceMultiplier can be accurate to 8 decimal places (e.g. 0.00000001).
    const multiplierPrecision = 10 ** 8;
    const feeGasPriceMultiplier = BigInt(this.feeGasPriceMultiplier * multiplierPrecision);
    const gasPriceInWei = (this.priceTracker.getMinGasPrice() * feeGasPriceMultiplier) / BigInt(multiplierPrecision);
    const { decimals } = this.assets[assetId];
    const scaleFactor = 10n ** BigInt(decimals);
    // the units here are inconsistent, fee is in base units, asset cost in wei is not
    // the result is a number that is 10n ** BigInt(decimals) too large.
    // but we want to keep numbers as large as possible until the end where we will scale back down
    const amountOfWeiProvided = assetCostInWei * fee;
    const gasPaidForUnscaled = amountOfWeiProvided / gasPriceInWei;
    const gasPaidforScaled = gasPaidForUnscaled / scaleFactor;
    return Number(gasPaidforScaled);
  }

  public getBaseTxGas() {
    return Math.ceil(this.verificationGas / this.txsPerRollup);
  }

  public getTxGas(assetId: number, txType: TxType) {
    return this.getBaseTxGas() + this.getGasOverheadForTxType(assetId, txType);
  }

  private getBaseFee(assetId: number, minPrice = false) {
    return this.toAssetPrice(assetId, this.getBaseTxGas(), minPrice);
  }

  private toAssetPrice(assetId: number, gas: number, minPrice: boolean) {
    const price = minPrice ? this.priceTracker.getMinAssetPrice(assetId) : this.priceTracker.getAssetPrice(assetId);
    const { decimals } = this.assets[assetId];
    return !price
      ? 0n
      : roundUp(
          this.applyGasPrice(BigInt(gas) * 10n ** BigInt(decimals), minPrice) / price,
          this.numSignificantFigures,
        );
  }

  private getFeeConstant(assetId: number, txType: TxType, minPrice = false) {
    return this.toAssetPrice(assetId, this.getGasOverheadForTxType(assetId, txType), minPrice);
  }

  private applyGasPrice(value: bigint, minPrice: boolean) {
    const gasPrice = minPrice ? this.priceTracker.getMinGasPrice() : this.priceTracker.getGasPrice();
    const multiplierPrecision = 10 ** 8;
    const feeGasPriceMultiplier = BigInt(this.feeGasPriceMultiplier * multiplierPrecision);
    const expectedValue = (value * gasPrice * feeGasPriceMultiplier) / BigInt(multiplierPrecision);
    const maxValue = this.maxFeeGasPrice ? value * this.maxFeeGasPrice : expectedValue;
    return expectedValue > maxValue ? maxValue : expectedValue;
  }

  private getGasOverheadForTxType(assetId: number, txType: TxType) {
    const gasPerByte = 4;
    switch (txType) {
      case TxType.ACCOUNT:
        return (OffchainAccountData.SIZE + RollupAccountProofData.ENCODED_LENGTH) * gasPerByte;
      case TxType.DEFI_CLAIM:
        return (OffchainDefiClaimData.SIZE + RollupDefiClaimProofData.ENCODED_LENGTH) * gasPerByte;
      case TxType.DEFI_DEPOSIT:
        return (OffchainDefiDepositData.SIZE + RollupDefiDepositProofData.ENCODED_LENGTH) * gasPerByte;
      case TxType.DEPOSIT:
        // 64 bytes of signature data.
        // 3500 gas for ecrecover.
        return (64 + OffchainJoinSplitData.SIZE + RollupDepositProofData.ENCODED_LENGTH) * gasPerByte + 3500;
      case TxType.TRANSFER:
        return (OffchainJoinSplitData.SIZE + RollupSendProofData.ENCODED_LENGTH) * gasPerByte;
      case TxType.WITHDRAW_TO_CONTRACT:
      case TxType.WITHDRAW_TO_WALLET:
        return (
          this.assets[assetId].gasLimit +
          (OffchainJoinSplitData.SIZE + RollupWithdrawProofData.ENCODED_LENGTH) * gasPerByte
        );
    }
  }
}

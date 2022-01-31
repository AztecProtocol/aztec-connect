import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { BlockchainAsset, TxType } from '@aztec/barretenberg/blockchain';
import { ProofData } from '@aztec/barretenberg/client_proofs/proof_data';
import { TxDao } from '../entity/tx';
import { PriceTracker } from './price_tracker';
import { roundUp } from './round_up';

export class FeeCalculator {
  constructor(
    private readonly priceTracker: PriceTracker,
    private readonly assets: BlockchainAsset[],
    private readonly baseTxGas: number,
    private readonly maxFeeGasPrice: bigint,
    private readonly feeGasPriceMultiplier: number,
    private readonly txsPerRollup: number,
    private readonly publishInterval: number,
    private readonly surplusRatios = [1, 0],
    private readonly freeAssets: number[] = [],
    private readonly freeTxTypes: TxType[] = [],
    private readonly numSignificantFigures = 0,
  ) {}

  getMinTxFee(assetId: number, txType: TxType) {
    if (this.freeTxTypes.includes(txType)) {
      return 0n;
    }
    return this.getFeeConstant(assetId, txType, true) + this.getBaseFee(assetId, true);
  }

  getTxFee(assetId: number, txType: TxType) {
    if (this.freeTxTypes.includes(txType)) {
      return 0n;
    }
    return this.getFeeConstant(assetId, txType) + this.getBaseFee(assetId);
  }

  getFeeQuotes(assetId: number) {
    const baseFee = this.getBaseFee(assetId);
    return {
      feeConstants: [
        TxType.DEPOSIT,
        TxType.TRANSFER,
        TxType.WITHDRAW_TO_WALLET,
        TxType.WITHDRAW_TO_CONTRACT,
        TxType.ACCOUNT,
        TxType.DEFI_DEPOSIT,
        TxType.DEFI_CLAIM,
      ].map(txType => (this.freeTxTypes.includes(txType) ? 0n : baseFee + this.getFeeConstant(assetId, txType))),
      baseFeeQuotes: this.surplusRatios.map(ratio => ({
        fee: baseFee * BigInt(Math.round(this.txsPerRollup * (1 - ratio))),
        time: Math.max(5 * 60, this.publishInterval * ratio),
      })),
    };
  }

  getTxFeeFromGas(gas: bigint, assetId: number) {
    const baseFee = this.getBaseFee(assetId);
    return baseFee + this.toAssetPrice(assetId, gas, false);
  }

  computeSurplusRatio(txs: TxDao[]) {
    const baseFees = this.assets.map((_, id) => this.getBaseFee(id));
    const surplus = txs
      .map(tx => {
        const proofData = new ProofData(tx.proofData);
        const txFeeAssetId = proofData.txFeeAssetId.readUInt32BE(28);
        const txFee = toBigIntBE(proofData.txFee);
        const currentFee = this.getTxFee(txFeeAssetId, tx.txType);
        return baseFees[txFeeAssetId] ? Number((txFee - currentFee) / baseFees[txFeeAssetId]) : 0;
      })
      .reduce((acc, exc) => acc + exc, 0);
    const ratio = +(1 - surplus / this.txsPerRollup).toFixed(2);
    return Math.min(1, Math.max(0, ratio));
  }

  getBaseFee(assetId: number, minPrice = false) {
    if (this.freeAssets.includes(assetId)) {
      return 0n;
    }
    return this.toAssetPrice(assetId, BigInt(this.baseTxGas), minPrice);
  }

  public getFeeConstant(assetId: number, txType: TxType, minPrice = false) {
    if (this.freeAssets.includes(assetId)) {
      return 0n;
    }
    return this.toAssetPrice(assetId, BigInt(this.assets[assetId].gasConstants[txType]), minPrice);
  }

  public getGasPaidForByFee(assetId: number, fee: bigint) {
    const assetCostInWei = this.priceTracker.getAssetPrice(assetId);
    const gasPriceInWei = (this.priceTracker.getMinGasPrice() * BigInt(this.feeGasPriceMultiplier * 100)) / 100n;
    const { decimals } = this.assets[assetId];
    const scaleFactor = 10n ** BigInt(decimals);
    // the units here are inconsistent, fee is in base units, asset cost in wei is not
    // the result is a number that is 10n ** BigInt(decimals) too large.
    // but we want to keep numbers as large as possible until the end where we will scale back down
    const amountOfWeiProvided = assetCostInWei * fee;
    const gasPaidForUnscaled = amountOfWeiProvided / gasPriceInWei;
    const gasPaidforScaled = gasPaidForUnscaled / scaleFactor;
    return gasPaidforScaled;
  }

  public getBaseTxGas() {
    return this.baseTxGas;
  }

  public getTxGas(assetId: number, txType: TxType) {
    return this.baseTxGas + this.assets[assetId].gasConstants[txType];
  }

  private toAssetPrice(assetId: number, gas: bigint, minPrice: boolean) {
    const price = minPrice ? this.priceTracker.getMinAssetPrice(assetId) : this.priceTracker.getAssetPrice(assetId);
    const { decimals } = this.assets[assetId];
    return !price
      ? 0n
      : roundUp(this.applyGasPrice(gas * 10n ** BigInt(decimals), minPrice) / price, this.numSignificantFigures);
  }

  private applyGasPrice(value: bigint, minPrice: boolean) {
    const gasPrice = minPrice ? this.priceTracker.getMinGasPrice() : this.priceTracker.getGasPrice();
    const expectedValue = (value * gasPrice * BigInt(this.feeGasPriceMultiplier * 100)) / 100n;
    const maxValue = this.maxFeeGasPrice ? value * this.maxFeeGasPrice : expectedValue;
    return expectedValue > maxValue ? maxValue : expectedValue;
  }
}

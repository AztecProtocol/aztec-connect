import { AssetId } from 'barretenberg/asset';
import { BlockchainAsset, TxType } from 'barretenberg/blockchain';
import { JoinSplitProofData, ProofData } from 'barretenberg/client_proofs/proof_data';
import { AssetFeeQuote } from 'barretenberg/rollup_provider';
import { TxDao } from '../entity/tx';
import { PriceTracker } from './price_tracker';
import { roundUp } from './round_up';

export class FeeCalculator {
  constructor(
    private priceTracker: PriceTracker,
    private assets: BlockchainAsset[],
    private baseTxGas: number,
    private maxFeeGasPrice: bigint,
    private feeGasPriceMultiplier: number,
    private txsPerRollup: number,
    private publishInterval: number,
    private surplusRatios = [1, 0.9, 0.5, 0],
    private feeFreeAssets: AssetId[] = [],
    private freeTxTypes: TxType[] = [],
    private numSignificantFigures = 0,
  ) {}

  getMinTxFee(assetId: number, txType: TxType) {
    if (this.freeTxTypes.includes(txType)) {
      return 0n;
    }
    return this.getFeeConstant(assetId, txType) + this.getBaseFee(assetId);
  }

  getFeeQuotes(assetId: number): AssetFeeQuote {
    const baseFee = this.getBaseFee(assetId);
    return {
      feeConstants: [
        TxType.DEPOSIT,
        TxType.TRANSFER,
        TxType.WITHDRAW_TO_WALLET,
        TxType.WITHDRAW_TO_CONTRACT,
        TxType.ACCOUNT,
      ].map(txType => (this.freeTxTypes.includes(txType) ? 0n : baseFee + this.getFeeConstant(assetId, txType))),
      baseFeeQuotes: this.surplusRatios.map(ratio => ({
        fee: baseFee * BigInt(Math.round(this.txsPerRollup * (1 - ratio))),
        time: Math.max(5 * 60, this.publishInterval * ratio),
      })),
    };
  }

  computeSurplusRatio(txs: TxDao[]) {
    const baseFees = this.assets.map((_, id) => this.getBaseFee(id));
    const surplus = txs
      .map(tx => {
        const { assetId, txFee } = this.getFeeForTxDao(tx);
        if (!baseFees[assetId]) {
          return 0;
        }
        const minFee = this.getMinTxFee(assetId, tx.txType);
        return Number((txFee - minFee) / baseFees[assetId]);
      })
      .reduce((acc, exc) => acc + exc, 0);
    const ratio = +(1 - surplus / this.txsPerRollup).toFixed(2);
    return Math.min(1, Math.max(0, ratio));
  }

  getBaseFee(assetId: AssetId) {
    if (this.feeFreeAssets.includes(assetId)) {
      return 0n;
    }
    return this.toAssetPrice(assetId, BigInt(this.baseTxGas));
  }

  private getFeeConstant(assetId: AssetId, txType: TxType) {
    if (this.feeFreeAssets.includes(assetId)) {
      return 0n;
    }
    return this.toAssetPrice(assetId, BigInt(this.assets[assetId].gasConstants[txType]));
  }

  private toAssetPrice(assetId: AssetId, gas: bigint) {
    const price = this.priceTracker.getAssetPrice(assetId);
    const { decimals } = this.assets[assetId];
    return !price ? 0n : roundUp(this.applyGasPrice(gas * 10n ** BigInt(decimals)) / price, this.numSignificantFigures);
  }

  private applyGasPrice(value: bigint) {
    const gasPrice = this.priceTracker.getGasPrice();
    const expectedValue = (value * gasPrice * BigInt(this.feeGasPriceMultiplier * 100)) / 100n;
    const maxValue = this.maxFeeGasPrice ? value * this.maxFeeGasPrice : expectedValue;
    return expectedValue > maxValue ? maxValue : expectedValue;
  }

  private getFeeForTxDao(tx: TxDao) {
    if (tx.txType === TxType.ACCOUNT) {
      return { assetId: AssetId.ETH, txFee: 0n };
    }

    const proofData = new ProofData(tx.proofData);
    const {
      assetId,
      proofData: { txFee },
    } = new JoinSplitProofData(proofData);
    return { assetId, txFee };
  }
}

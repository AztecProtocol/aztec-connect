import { Blockchain, BlockchainAsset, TxType } from 'barretenberg/blockchain';
import { AssetFeeQuote } from 'barretenberg/rollup_provider';
import { AssetId } from 'barretenberg/asset';
import { fromBaseUnits } from 'blockchain';
import { TxDao } from './entity/tx';
import { JoinSplitProofData, ProofData } from 'barretenberg/client_proofs/proof_data';

export class TxFeeResolver {
  private assets!: BlockchainAsset[];

  constructor(
    private blockchain: Blockchain,
    private baseTxGas: number,
    private feeGasPrice: bigint,
    private txsPerRollup: number,
    private publishInterval: number,
  ) {}

  public async init() {
    const { assets } = await this.blockchain.getBlockchainStatus();
    this.assets = assets;
  }

  public getTxFee(assetId: number, txType: TxType) {
    if (txType === TxType.ACCOUNT_OTHER || txType === TxType.ACCOUNT_REGISTRATION) {
      return 0n;
    }
    return BigInt(this.assets[assetId].gasConstants[txType] + this.baseTxGas) * this.feeGasPrice;
  }

  public getFeeQuotes(assetId: number): AssetFeeQuote {
    const baseFee = BigInt(this.baseTxGas) * this.feeGasPrice;
    return {
      feeConstants: this.assets[assetId].gasConstants.map(c => BigInt(c) * this.feeGasPrice),
      baseFeeQuotes: [
        {
          // slow
          fee: baseFee,
          time: this.publishInterval,
        },
        {
          // average
          fee: baseFee * BigInt(Math.round(this.txsPerRollup * 0.1) || 1),
          time: this.publishInterval * 0.9,
        },
        {
          // fast
          fee: baseFee * BigInt(Math.round(this.txsPerRollup * 0.5) || 1),
          time: this.publishInterval * 0.5,
        },
        {
          // instant
          fee: baseFee * BigInt(this.txsPerRollup),
          time: 5 * 60,
        },
      ],
    };
  }

  private computeSurplusTxFees(txs: { assetId: AssetId; fee: bigint; txType: TxType }[]) {
    return txs.reduce((acc, tx) => {
      const expectedFee = this.getTxFee(tx.assetId, tx.txType);
      return acc + (tx.fee - expectedFee);
    }, 0n);
  }

  public computeSurplusRatio(txs: { assetId: AssetId; fee: bigint; txType: TxType }[]) {
    const baseRollupFee = BigInt(this.txsPerRollup * this.baseTxGas) * this.feeGasPrice;
    if (baseRollupFee === 0n) {
      return 1;
    }
    const feeSurplus = this.computeSurplusTxFees(txs);
    const ratio = Math.max(1 - +fromBaseUnits(feeSurplus, 18) / +fromBaseUnits(baseRollupFee, 18), 0);
    return Math.min(ratio, 1);
  }

  public computeSurplusRatioFromTxDaos(txs: TxDao[]) {
    return this.computeSurplusRatio(
      txs
        .filter(({ txType }) => txType !== TxType.ACCOUNT_OTHER && txType !== TxType.ACCOUNT_REGISTRATION)
        .map(tx => {
          const proofData = new JoinSplitProofData(new ProofData(tx.proofData));
          return {
            fee: proofData.proofData.txFee,
            assetId: proofData.assetId,
            txType: tx.txType,
          };
        }),
    );
  }
}

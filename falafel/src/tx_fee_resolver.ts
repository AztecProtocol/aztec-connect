import { Blockchain, BlockchainAsset, TxType } from 'barretenberg/blockchain';

export class TxFeeResolver {
  private assets!: BlockchainAsset[];

  constructor(private blockchain: Blockchain, private baseTxGas: number, private feeGasPrice: bigint) {}

  public async init() {
    const { assets } = await this.blockchain.getBlockchainStatus();
    this.assets = assets;
  }

  public getTxFee(assetId: number, txType: TxType) {
    return BigInt(this.assets[assetId].gasConstants[txType] + this.baseTxGas) * this.feeGasPrice;
  }

  public getTxFees() {
    return this.assets.map(a => a.gasConstants.map(c => BigInt(c + this.baseTxGas) * this.feeGasPrice));
  }
}

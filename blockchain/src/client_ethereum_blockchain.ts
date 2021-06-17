import { Web3Provider } from '@ethersproject/providers';
import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { Asset, BlockchainAsset, PermitArgs } from '@aztec/barretenberg/blockchain';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { EthAsset, TokenAsset } from './asset';
import { EthereumProvider } from './ethereum_provider';
import { hashData } from './hash_data';
import { RollupProcessor } from './rollup_processor';

export class ClientEthereumBlockchain {
  private provider: Web3Provider;
  private rollupProcessor: RollupProcessor;
  private assets: Asset[];

  constructor(
    rollupContractAddress: EthAddress,
    assetInfos: BlockchainAsset[],
    private ethereumProvider: EthereumProvider,
    private minConfirmation = 1,
  ) {
    this.provider = new Web3Provider(this.ethereumProvider);
    this.rollupProcessor = new RollupProcessor(rollupContractAddress, this.provider);
    this.assets = assetInfos.map(info =>
      info.address.equals(EthAddress.ZERO)
        ? new EthAsset(this.provider)
        : new TokenAsset(this.provider, info, minConfirmation),
    );
  }

  public getAsset(assetId: AssetId) {
    return this.assets[assetId];
  }

  public async getUserPendingDeposit(assetId: AssetId, account: EthAddress) {
    return this.rollupProcessor.getUserPendingDeposit(assetId, account);
  }

  public async getUserProofApprovalStatus(account: EthAddress, signingData: Buffer) {
    const proofHash = hashData(signingData);
    return this.rollupProcessor.getUserProofApprovalStatus(account, proofHash);
  }

  public async depositPendingFunds(
    assetId: AssetId,
    amount: bigint,
    from: EthAddress,
    permitArgs?: PermitArgs,
    provider?: EthereumProvider,
  ) {
    return this.rollupProcessor.depositPendingFunds(assetId, amount, permitArgs, this.getEthSigner(from, provider));
  }

  public async approveProof(account: EthAddress, signingData: Buffer, provider?: EthereumProvider) {
    const proofHash = hashData(signingData);
    return this.rollupProcessor.approveProof(proofHash, this.getEthSigner(account, provider));
  }

  /**
   * Wait for given transaction to be mined, and return receipt.
   */
  public async getTransactionReceipt(
    txHash: TxHash,
    interval = 1,
    timeout = 300,
    minConfirmation = this.minConfirmation,
  ) {
    const started = Date.now();
    while (true) {
      if (timeout && Date.now() - started > timeout * 1000) {
        throw new Error(`Timeout awaiting tx confirmation: ${txHash}`);
      }

      const txReceipt = await this.provider.getTransactionReceipt(txHash.toString());
      if (!minConfirmation || (txReceipt && txReceipt.confirmations >= minConfirmation)) {
        return txReceipt
          ? { status: !!txReceipt.status, blockNum: txReceipt.blockNumber }
          : { status: false, blockNum: 0 };
      }

      await new Promise(resolve => setTimeout(resolve, interval * 1000));
    }
  }

  public async isContract(address: EthAddress) {
    return (await this.provider.getCode(address.toString())) !== '0x';
  }

  private getEthSigner(address: EthAddress, provider?: EthereumProvider) {
    return (provider ? new Web3Provider(provider) : this.provider).getSigner(address.toString());
  }
}

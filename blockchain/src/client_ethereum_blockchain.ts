import { EthAddress } from '@aztec/barretenberg/address';
import { Asset, BlockchainAsset, EthereumProvider, PermitArgs, TxHash } from '@aztec/barretenberg/blockchain';
import { Web3Provider } from '@ethersproject/providers';
import { EthAsset, TokenAsset } from './contracts/asset';
import { RollupProcessor } from './contracts/rollup_processor';

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
    this.rollupProcessor = new RollupProcessor(rollupContractAddress, ethereumProvider);
    this.assets = assetInfos.map(info =>
      info.address.equals(EthAddress.ZERO)
        ? new EthAsset(ethereumProvider)
        : new TokenAsset(ethereumProvider, info, minConfirmation),
    );
  }

  public getAsset(assetId: number) {
    return this.assets[assetId];
  }

  public async getUserPendingDeposit(assetId: number, account: EthAddress) {
    return this.rollupProcessor.getUserPendingDeposit(assetId, account);
  }

  public async getUserProofApprovalStatus(account: EthAddress, txId: Buffer) {
    return this.rollupProcessor.getProofApprovalStatus(account, txId);
  }

  public async depositPendingFunds(
    assetId: number,
    amount: bigint,
    from: EthAddress,
    proofHash?: Buffer,
    permitArgs?: PermitArgs,
    provider?: EthereumProvider,
  ) {
    return this.rollupProcessor.depositPendingFunds(assetId, amount, proofHash, permitArgs, {
      signingAddress: from,
      provider,
    });
  }

  public async approveProof(account: EthAddress, txId: Buffer, provider?: EthereumProvider) {
    return this.rollupProcessor.approveProof(txId, { signingAddress: account, provider });
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

  public async getChainId() {
    const { chainId } = await this.provider.getNetwork();
    return chainId;
  }
}

import { EthAddress } from '@aztec/barretenberg/address';
import {
  Asset,
  BlockchainAsset,
  BlockchainBridge,
  EthereumProvider,
  EthereumSignature,
  SendTxOptions,
  TxHash,
} from '@aztec/barretenberg/blockchain';
import { Web3Provider } from '@ethersproject/providers';
import { EthAsset, TokenAsset } from './contracts';
import { RollupProcessor } from './contracts/rollup_processor';

export class ClientEthereumBlockchain {
  private readonly rollupProcessor: RollupProcessor;
  private readonly provider: Web3Provider;
  private assets: Asset[];

  constructor(
    rollupContractAddress: EthAddress,
    assets: BlockchainAsset[],
    private readonly bridges: BlockchainBridge[],
    private readonly ethereumProvider: EthereumProvider,
    private readonly minConfirmations: number,
  ) {
    this.rollupProcessor = new RollupProcessor(rollupContractAddress, ethereumProvider);
    this.provider = new Web3Provider(this.ethereumProvider);
    this.assets = assets.map(asset => {
      if (asset.address.equals(EthAddress.ZERO)) {
        return new EthAsset(this.ethereumProvider);
      } else {
        return TokenAsset.new(asset, this.ethereumProvider);
      }
    });
  }

  public async getChainId() {
    return (await this.provider.getNetwork()).chainId;
  }

  public getAsset(assetId: number) {
    return this.assets[assetId];
  }

  public getAssetIdByAddress(address: EthAddress, gasLimit?: number) {
    const assetId = this.assets.findIndex(
      a =>
        a.getStaticInfo().address.equals(address) &&
        (gasLimit === undefined || a.getStaticInfo().gasLimit === gasLimit),
    );
    if (assetId < 0) {
      throw new Error(`Unknown asset. Address: ${address}. Gas limit: ${gasLimit}.`);
    }
    return assetId;
  }

  public getAssetIdBySymbol(symbol: string, gasLimit?: number) {
    const assetId = this.assets.findIndex(
      a =>
        a.getStaticInfo().symbol.toLowerCase() === symbol.toLowerCase() &&
        (gasLimit === undefined || a.getStaticInfo().gasLimit === gasLimit),
    );
    if (assetId < 0) {
      throw new Error(`Unknown asset. Symbol: ${symbol}. Gas limit: ${gasLimit}.`);
    }
    return assetId;
  }

  public getFeePayingAssetIds() {
    return this.assets.flatMap((asset, id) => (asset.getStaticInfo().isFeePaying ? [id] : []));
  }

  public getBridgeAddressId(address: EthAddress, gasLimit?: number) {
    const index = this.bridges.findIndex(
      b => b.address.equals(address) && (gasLimit === undefined || b.gasLimit === gasLimit),
    );
    if (index < 0) {
      throw new Error(`Unknown bridge. Address: ${address}. Gas limit: ${gasLimit}.`);
    }
    return index + 1;
  }

  public async getUserPendingDeposit(assetId: number, account: EthAddress) {
    return this.rollupProcessor.getUserPendingDeposit(assetId, account);
  }

  public async getUserProofApprovalStatus(account: EthAddress, txId: Buffer) {
    return this.rollupProcessor.getProofApprovalStatus(account, txId);
  }

  public async depositPendingFunds(assetId: number, amount: bigint, proofHash?: Buffer, options?: SendTxOptions) {
    return this.rollupProcessor.depositPendingFunds(assetId, amount, proofHash, options);
  }

  public async depositPendingFundsPermit(
    assetId: number,
    amount: bigint,
    deadline: bigint,
    signature: EthereumSignature,
    proofHash?: Buffer,
    options?: SendTxOptions,
  ) {
    return this.rollupProcessor.depositPendingFundsPermit(assetId, amount, deadline, signature, proofHash, options);
  }

  public async depositPendingFundsPermitNonStandard(
    assetId: number,
    amount: bigint,
    nonce: bigint,
    deadline: bigint,
    signature: EthereumSignature,
    proofHash?: Buffer,
    options?: SendTxOptions,
  ) {
    return this.rollupProcessor.depositPendingFundsPermitNonStandard(
      assetId,
      amount,
      nonce,
      deadline,
      signature,
      proofHash,
      options,
    );
  }

  public async approveProof(txId: Buffer, options?: SendTxOptions) {
    return this.rollupProcessor.approveProof(txId, options);
  }

  public async processAsyncDefiInteraction(interactionNonce: number, options?: SendTxOptions) {
    return this.rollupProcessor.processAsyncDefiInteraction(interactionNonce, options);
  }

  public async isContract(address: EthAddress) {
    return (await this.provider.getCode(address.toString())) !== '0x';
  }

  public async setSupportedAsset(assetAddress: EthAddress, assetGasLimit?: number, options?: SendTxOptions) {
    const txHash = await this.rollupProcessor.setSupportedAsset(assetAddress, assetGasLimit, options);
    return txHash;
  }

  public async setSupportedBridge(bridgeAddress: EthAddress, bridgeGasLimit?: number, options?: SendTxOptions) {
    const txHash = await this.rollupProcessor.setSupportedBridge(bridgeAddress, bridgeGasLimit, options);
    return txHash;
  }

  /**
   * Wait for given transaction to be mined, and return receipt.
   */
  public async getTransactionReceipt(
    txHash: TxHash,
    interval = 1,
    timeout = 300,
    minConfirmations = this.minConfirmations,
  ) {
    const started = Date.now();
    while (true) {
      if (timeout && Date.now() - started > timeout * 1000) {
        throw new Error(`Timeout awaiting tx confirmation: ${txHash}`);
      }

      const txReceipt = await this.provider.getTransactionReceipt(txHash.toString());
      if (!minConfirmations || (txReceipt && txReceipt.confirmations >= minConfirmations)) {
        return txReceipt
          ? { status: !!txReceipt.status, blockNum: txReceipt.blockNumber }
          : { status: false, blockNum: 0 };
      }

      await new Promise(resolve => setTimeout(resolve, interval * 1000));
    }
  }
}

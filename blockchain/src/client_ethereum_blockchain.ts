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
import { getBlockchainStatus } from '@aztec/barretenberg/service';
import { EthAsset, TokenAsset } from './contracts/asset';
import { RollupProcessor } from './contracts/rollup_processor';

export class ClientEthereumBlockchain {
  private readonly provider: Web3Provider;
  private assets: Asset[] = [];
  private bridges: BlockchainBridge[] = [];

  constructor(
    private readonly serverUrl: string,
    private readonly rollupProcessor: RollupProcessor,
    private readonly ethereumProvider: EthereumProvider,
    private readonly minConfirmations = 1,
  ) {
    this.provider = new Web3Provider(this.ethereumProvider);
  }

  static new(
    serverUrl: string,
    rollupContractAddress: EthAddress,
    ethereumProvider: EthereumProvider,
    minConfirmations = 1,
  ) {
    const rollupProcessor = new RollupProcessor(rollupContractAddress, ethereumProvider, minConfirmations);
    return new ClientEthereumBlockchain(serverUrl, rollupProcessor, ethereumProvider, minConfirmations);
  }

  public async init() {
    const { assets, bridges, chainId } = await getBlockchainStatus(this.serverUrl);
    const providerChainId = (await this.provider.getNetwork()).chainId;
    if (chainId !== providerChainId) {
      throw new Error(`Provider chainId ${providerChainId} does not match rollup provider chainId ${chainId}.`);
    }

    this.updateAssets(assets);
    this.updateBridges(bridges);
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
    const fromIndex = this.assets.length;
    const txHash = await this.rollupProcessor.setSupportedAsset(assetAddress, assetGasLimit, options);
    await this.ensureAssetAdded(assetAddress, assetGasLimit, fromIndex);
    return txHash;
  }

  public async setSupportedBridge(bridgeAddress: EthAddress, bridgeGasLimit?: number, options?: SendTxOptions) {
    const fromIndex = this.bridges.length;
    const txHash = await this.rollupProcessor.setSupportedBridge(bridgeAddress, bridgeGasLimit, options);
    await this.ensureBridgeAdded(bridgeAddress, bridgeGasLimit, fromIndex);
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

  private updateAssets(assets: BlockchainAsset[]) {
    this.assets = assets.map(info =>
      info.address.equals(EthAddress.ZERO)
        ? new EthAsset(this.ethereumProvider)
        : TokenAsset.new(info, this.ethereumProvider, this.minConfirmations),
    );
  }

  private updateBridges(bridges: BlockchainBridge[]) {
    this.bridges = bridges;
  }

  private async ensureAssetAdded(assetAddress: EthAddress, assetGasLimit: number | undefined, fromIndex: number) {
    while (true) {
      const { assets } = await getBlockchainStatus(this.serverUrl);
      const asset = assets
        .slice(fromIndex)
        .find(a => a.address.equals(assetAddress) && (assetGasLimit === undefined || a.gasLimit === assetGasLimit));
      if (asset) {
        this.updateAssets(assets);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  private async ensureBridgeAdded(bridgeAddress: EthAddress, bridgeGasLimit: number | undefined, fromIndex: number) {
    while (true) {
      const { bridges } = await getBlockchainStatus(this.serverUrl);
      const bridge = bridges
        .slice(fromIndex)
        .find(b => b.address.equals(bridgeAddress) && (bridgeGasLimit === undefined || b.gasLimit === bridgeGasLimit));
      if (bridge) {
        this.updateBridges(bridges);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

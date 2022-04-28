import { EthAddress } from '@aztec/barretenberg/address';
import {
  Asset,
  EthereumProvider,
  EthereumRpc,
  FeeData,
  PriceFeed,
  SendTxOptions,
  TxHash,
  TypedData,
} from '@aztec/barretenberg/blockchain';
import { Web3Provider } from '@ethersproject/providers';
import { Web3Signer } from '../signer';
import { EthAsset, TokenAsset } from './asset';
import { FeeDistributor } from './fee_distributor';
import { EthPriceFeed, GasPriceFeed, TokenPriceFeed } from './price_feed';
import { RollupProcessor } from './rollup_processor';

/**
 * Facade around all Aztec smart contract classes.
 * Provides a factory function `fromAddresses` to simplify construction of all contract classes.
 * Exposes a more holistic interface to clients, than having to deal with individual contract classes.
 */
export class Contracts {
  private readonly provider!: Web3Provider;
  private readonly ethereumRpc!: EthereumRpc;

  constructor(
    private readonly rollupProcessor: RollupProcessor,
    private readonly feeDistributor: FeeDistributor,
    private assets: Asset[],
    private readonly feePayingAssetAddresses: EthAddress[],
    private readonly gasPriceFeed: GasPriceFeed,
    private readonly priceFeeds: PriceFeed[],
    private readonly ethereumProvider: EthereumProvider,
    private readonly confirmations: number,
  ) {
    this.provider = new Web3Provider(ethereumProvider);
    this.ethereumRpc = new EthereumRpc(ethereumProvider);
  }

  static fromAddresses(
    rollupContractAddress: EthAddress,
    feeDistributorAddress: EthAddress,
    priceFeedContractAddresses: EthAddress[],
    feePayingAssetAddresses: EthAddress[],
    ethereumProvider: EthereumProvider,
    confirmations: number,
  ) {
    const rollupProcessor = new RollupProcessor(rollupContractAddress, ethereumProvider);

    const feeDistributor = new FeeDistributor(feeDistributorAddress, ethereumProvider);

    const assets = [new EthAsset(ethereumProvider)];

    const [gasPriceFeedAddress, ...tokenPriceFeedAddresses] = priceFeedContractAddresses;
    const gasPriceFeed = new GasPriceFeed(gasPriceFeedAddress, ethereumProvider);
    const priceFeeds = [
      new EthPriceFeed(),
      ...tokenPriceFeedAddresses.map(a => new TokenPriceFeed(a, ethereumProvider)),
    ];

    return new Contracts(
      rollupProcessor,
      feeDistributor,
      assets,
      feePayingAssetAddresses,
      gasPriceFeed,
      priceFeeds,
      ethereumProvider,
      confirmations,
    );
  }

  public async init() {
    await this.updateAssets();
  }

  public getProvider() {
    return this.ethereumProvider;
  }

  public async updateAssets() {
    const supportedAssets = await this.rollupProcessor.getSupportedAssets();
    const newAssets = await Promise.all(
      supportedAssets.slice(this.assets.length - 1).map(async ({ address, gasLimit }) =>
        TokenAsset.fromAddress(
          address,
          this.ethereumProvider,
          gasLimit,
          this.feePayingAssetAddresses.some(feePayingAsset => address.equals(feePayingAsset)),
          this.confirmations,
        ),
      ),
    );
    this.assets = [...this.assets, ...newAssets];
  }

  public async getPerRollupState() {
    const defiInteractionHashes = await this.rollupProcessor.defiInteractionHashes();

    return {
      defiInteractionHashes,
    };
  }

  public async getPerBlockState() {
    const { escapeOpen, blocksRemaining } = await this.rollupProcessor.getEscapeHatchStatus();
    const allowThirdPartyContracts = await this.rollupProcessor.getThirdPartyContractStatus();

    return {
      escapeOpen,
      numEscapeBlocksRemaining: blocksRemaining,
      allowThirdPartyContracts,
    };
  }

  public getRollupBalance(assetId: number) {
    return this.assets[assetId].balanceOf(this.rollupProcessor.address);
  }

  public getFeeDistributorBalance(assetId: number) {
    return this.assets[assetId].balanceOf(this.feeDistributor.address);
  }

  public getRollupContractAddress() {
    return this.rollupProcessor.address;
  }

  public getFeeDistributorContractAddress() {
    return this.feeDistributor.address;
  }

  public async getVerifierContractAddress() {
    return this.rollupProcessor.verifier();
  }

  async createRollupTxs(dataBuf: Buffer, signatures: Buffer[], offchainTxData: Buffer[]) {
    return this.rollupProcessor.createRollupTxs(dataBuf, signatures, offchainTxData);
  }

  public async sendTx(data: Buffer, options: SendTxOptions = {}) {
    return this.rollupProcessor.sendTx(data, options);
  }

  public async estimateGas(data: Buffer) {
    return this.rollupProcessor.estimateGas(data);
  }

  public async getRollupBlocksFrom(rollupId: number, minConfirmations = this.confirmations) {
    return this.rollupProcessor.getRollupBlocksFrom(rollupId, minConfirmations);
  }

  public async getRollupBlock(rollupId: number) {
    return this.rollupProcessor.getRollupBlock(rollupId);
  }

  public async getUserPendingDeposit(assetId: number, account: EthAddress) {
    return this.rollupProcessor.getUserPendingDeposit(assetId, account);
  }

  public async getTransactionByHash(txHash: TxHash) {
    return this.ethereumRpc.getTransactionByHash(txHash);
  }

  public async getTransactionReceipt(txHash: TxHash) {
    return this.provider.getTransactionReceipt(txHash.toString());
  }

  public async getChainId() {
    const { chainId } = await this.provider.getNetwork();
    return chainId;
  }

  public async getBlockNumber() {
    return this.provider.getBlockNumber();
  }

  public async signPersonalMessage(message: Buffer, address: EthAddress) {
    const signer = new Web3Signer(this.ethereumProvider);
    return signer.signPersonalMessage(message, address);
  }

  public async signMessage(message: Buffer, address: EthAddress) {
    const signer = new Web3Signer(this.ethereumProvider);
    return signer.signMessage(message, address);
  }

  public async signTypedData(data: TypedData, address: EthAddress) {
    const signer = new Web3Signer(this.ethereumProvider);
    return signer.signTypedData(data, address);
  }

  public async getAssetPrice(assetId: number) {
    return this.priceFeeds[assetId].price();
  }

  public getPriceFeed(assetId: number) {
    return this.priceFeeds[assetId];
  }

  public getGasPriceFeed() {
    return this.gasPriceFeed;
  }

  public async getUserProofApprovalStatus(address: EthAddress, txId: Buffer) {
    return this.rollupProcessor.getProofApprovalStatus(address, txId);
  }

  public async isContract(address: EthAddress) {
    return (await this.provider.getCode(address.toString())) !== '0x';
  }

  public async getFeeData(): Promise<FeeData> {
    const { maxFeePerGas, maxPriorityFeePerGas, gasPrice } = await this.provider.getFeeData();
    return {
      maxFeePerGas: maxFeePerGas !== null ? BigInt(maxFeePerGas.toString()) : BigInt(0),
      maxPriorityFeePerGas: maxPriorityFeePerGas !== null ? BigInt(maxPriorityFeePerGas.toString()) : BigInt(0),
      gasPrice: gasPrice !== null ? BigInt(gasPrice.toString()) : BigInt(0),
    };
  }

  public getAssets() {
    return this.assets.map(a => a.getStaticInfo());
  }

  public async getSupportedBridges() {
    return this.rollupProcessor.getSupportedBridges();
  }

  public async getRevertError(txHash: TxHash) {
    return await this.rollupProcessor.getRevertError(txHash);
  }
}

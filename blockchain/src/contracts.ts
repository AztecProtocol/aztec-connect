import { Web3Provider } from '@ethersproject/providers';
import { EthAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/asset';
import { Asset, PriceFeed, SendTxOptions, TypedData } from 'barretenberg/blockchain';
import { TxHash } from 'barretenberg/tx_hash';
import { Contract, ethers } from 'ethers';
import { abi as FeeDistributorABI } from './artifacts/contracts/interfaces/IFeeDistributor.sol/IFeeDistributor.json';
import { EthAsset, TokenAsset } from './asset';
import { EthereumProvider } from './ethereum_provider';
import { EthPriceFeed, GasPriceFeed, TokenPriceFeed } from './price_feed';
import { RollupProcessor } from './rollup_processor';
import { Web3Signer } from './signer';

export class Contracts {
  private rollupProcessor: RollupProcessor;
  private feeDistributorContract!: Contract;
  private feeDistributorContractAddress!: EthAddress;
  private verifierContractAddress!: EthAddress;
  private assets!: Asset[];
  private gasPriceFeed!: GasPriceFeed;
  private priceFeeds!: PriceFeed[];
  private provider!: Web3Provider;
  private signer!: Web3Signer;

  constructor(
    private rollupContractAddress: EthAddress,
    private priceFeedContractAddresses: EthAddress[],
    ethereumProvider: EthereumProvider,
    private confirmations: number,
  ) {
    this.provider = new Web3Provider(ethereumProvider);
    this.signer = new Web3Signer(this.provider);
    this.rollupProcessor = new RollupProcessor(rollupContractAddress, this.provider);
  }

  public async init() {
    this.feeDistributorContractAddress = await this.rollupProcessor.feeDistributor();
    this.verifierContractAddress = await this.rollupProcessor.verifier();
    this.feeDistributorContract = new ethers.Contract(
      this.feeDistributorContractAddress.toString(),
      FeeDistributorABI,
      this.provider,
    );

    const assetAddresses = await this.rollupProcessor.getSupportedAssets();
    const tokenAssets = await Promise.all(
      assetAddresses.map(async (addr, i) =>
        TokenAsset.fromAddress(
          addr,
          this.provider,
          await this.rollupProcessor.getAssetPermitSupport(i + 1),
          this.confirmations,
        ),
      ),
    );
    this.assets = [new EthAsset(this.provider), ...tokenAssets];

    const [gasPriceFeedAddress, ...tokenPriceFeedAddresses] = this.priceFeedContractAddresses;
    if (gasPriceFeedAddress) {
      this.gasPriceFeed = new GasPriceFeed(gasPriceFeedAddress, this.provider);
      this.priceFeeds = [new EthPriceFeed(), ...tokenPriceFeedAddresses.map(a => new TokenPriceFeed(a, this.provider))];
    }
  }

  public async setSupportedAsset(assetAddress: EthAddress, supportsPermit: boolean, signingAddress?: EthAddress) {
    const signer = signingAddress ? this.provider.getSigner(signingAddress.toString()) : this.provider.getSigner(0);
    const tx = await this.rollupProcessor.setSupportedAsset(assetAddress, supportsPermit, signer);
    const tokenAsset = await TokenAsset.fromAddress(assetAddress, this.provider, supportsPermit);
    this.assets.push(tokenAsset);
    return tx;
  }

  private async getAssetValues(promise: Promise<bigint[]>) {
    const padding = Array<bigint>(this.assets.length).fill(BigInt(0));
    return [...(await promise), ...padding].slice(0, padding.length);
  }

  public async getPerRollupState() {
    const nextRollupId = await this.rollupProcessor.nextRollupId();
    const dataSize = await this.rollupProcessor.dataSize();
    const dataRoot = await this.rollupProcessor.dataRoot();
    const nullRoot = await this.rollupProcessor.nullRoot();
    const rootRoot = await this.rollupProcessor.rootRoot();

    const totalDeposited = await this.getAssetValues(this.rollupProcessor.totalDeposited());
    const totalWithdrawn = await this.getAssetValues(this.rollupProcessor.totalWithdrawn());
    const totalFees = await this.getAssetValues(this.rollupProcessor.totalFees());

    return {
      nextRollupId,
      dataRoot,
      nullRoot,
      rootRoot,
      dataSize,
      totalDeposited,
      totalWithdrawn,
      totalFees,
    };
  }

  public async getPerBlockState() {
    const { escapeOpen, blocksRemaining } = await this.rollupProcessor.getEscapeHatchStatus();
    const totalPendingDeposit = await this.getAssetValues(this.rollupProcessor.totalPendingDeposit());
    const feeDistributorBalance: bigint[] = [];

    for (let i = 0; i < this.assets.length; ++i) {
      feeDistributorBalance[i] = BigInt(await this.feeDistributorContract.txFeeBalance(i));
    }

    return {
      escapeOpen,
      numEscapeBlocksRemaining: blocksRemaining,
      totalPendingDeposit,
      feeDistributorBalance,
    };
  }

  public getRollupContractAddress() {
    return this.rollupContractAddress;
  }

  public getFeeDistributorContractAddress() {
    return this.feeDistributorContractAddress;
  }

  public getVerifierContractAddress() {
    return this.verifierContractAddress;
  }

  public async createEscapeHatchProofTx(
    proofData: Buffer,
    viewingKeys: Buffer[],
    signatures: Buffer[],
    signingAddress?: EthAddress,
  ) {
    return this.rollupProcessor.createEscapeHatchProofTx(proofData, viewingKeys, signatures, signingAddress);
  }

  public async createRollupProofTx(
    proofData: Buffer,
    signatures: Buffer[],
    viewingKeys: Buffer[],
    providerSignature: Buffer,
    providerAddress: EthAddress,
    feeReceiver: EthAddress,
    feeLimit: bigint,
  ) {
    return this.rollupProcessor.createRollupProofTx(
      proofData,
      signatures,
      viewingKeys,
      providerSignature,
      providerAddress,
      feeReceiver,
      feeLimit,
    );
  }

  public async sendTx(data: Buffer, options: SendTxOptions = {}) {
    console.log(`Contracts sendTx() with ${data.length} bytes of calldata.`);
    const { signingAddress, gasLimit } = options;
    const signer = signingAddress ? this.provider.getSigner(signingAddress.toString()) : this.provider.getSigner(0);
    const from = await signer.getAddress();
    const txRequest = {
      to: this.rollupContractAddress.toString(),
      from,
      gasLimit,
      data,
    };
    console.log({ txRequest });
    const txResponse = await signer.sendTransaction(txRequest);
    console.log({ txResponse });
    return TxHash.fromString(txResponse.hash);
  }

  public async estimateGas(data: Buffer) {
    const signer = this.provider.getSigner(0);
    const from = await signer.getAddress();
    const txRequest = {
      to: this.rollupContractAddress.toString(),
      from,
      data,
    };
    const estimate = await this.provider.estimateGas(txRequest);
    return estimate.toNumber();
  }

  public async getRollupBlocksFrom(rollupId: number, minConfirmations = this.confirmations) {
    return this.rollupProcessor.getRollupBlocksFrom(rollupId, minConfirmations);
  }

  public async getUserPendingDeposit(assetId: AssetId, account: EthAddress) {
    return this.rollupProcessor.getUserPendingDeposit(assetId, account);
  }

  public async getTransactionReceipt(txHash: TxHash) {
    return this.provider.getTransactionReceipt(txHash.toString());
  }

  public async getNetwork() {
    return this.provider.getNetwork();
  }

  public async getBlockNumber() {
    return this.provider.getBlockNumber();
  }

  public async signPersonalMessage(message: Buffer, address: EthAddress) {
    return this.signer.signPersonalMessage(message, address);
  }

  public async signMessage(message: Buffer, address: EthAddress) {
    return this.signer.signMessage(message, address);
  }

  public async signTypedData(data: TypedData, address: EthAddress) {
    return this.signer.signTypedData(data, address);
  }

  public getAssets() {
    return this.assets;
  }

  public getAsset(assetId: AssetId) {
    return this.assets[assetId];
  }

  public async getAssetPrice(assetId: AssetId) {
    return this.priceFeeds[assetId].price();
  }

  public getPriceFeed(assetId: AssetId) {
    return this.priceFeeds[assetId];
  }

  public getGasPriceFeed() {
    return this.gasPriceFeed;
  }

  public async getUserProofApprovalStatus(address: EthAddress, proofHash: string) {
    return this.rollupProcessor.getUserProofApprovalStatus(address, proofHash);
  }

  public async isContract(address: EthAddress) {
    return (await this.provider.getCode(address.toString())) !== '0x';
  }
}

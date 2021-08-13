import { Web3Provider } from '@ethersproject/providers';
import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { EthereumProvider, Asset, PriceFeed, SendTxOptions, TypedData } from '@aztec/barretenberg/blockchain';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { Contract } from 'ethers';
import { abi as DefiBridgeABI } from '../artifacts/contracts/interfaces/IDefiBridge.sol/IDefiBridge.json';
import { EthAsset, TokenAsset } from './asset';
import { EthPriceFeed, GasPriceFeed, TokenPriceFeed } from './price_feed';
import { RollupProcessor } from './rollup_processor';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { Web3Signer } from '../signer';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';
import { FeeDistributor } from './fee_distributor';

export class Contracts {
  private provider!: Web3Provider;

  constructor(
    private rollupProcessor: RollupProcessor,
    private feeDistributor: FeeDistributor,
    private assets: Asset[],
    private gasPriceFeed: GasPriceFeed,
    private priceFeeds: PriceFeed[],
    private ethereumProvider: EthereumProvider,
    private confirmations: number,
  ) {
    this.provider = new Web3Provider(ethereumProvider);
  }

  static async fromAddresses(
    rollupContractAddress: EthAddress,
    priceFeedContractAddresses: EthAddress[],
    ethereumProvider: EthereumProvider,
    confirmations: number,
  ) {
    const rollupProcessor = new RollupProcessor(rollupContractAddress, ethereumProvider);

    const feeDistributor = new FeeDistributor(await rollupProcessor.feeDistributor(), ethereumProvider);

    const assetAddresses = await rollupProcessor.getSupportedAssets();
    const tokenAssets = await Promise.all(
      assetAddresses
        .slice(1)
        .map(async (addr, i) =>
          TokenAsset.fromAddress(
            addr,
            ethereumProvider,
            await rollupProcessor.getAssetPermitSupport(i + 1),
            confirmations,
          ),
        ),
    );
    const assets = [new EthAsset(ethereumProvider), ...tokenAssets];

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
      gasPriceFeed,
      priceFeeds,
      ethereumProvider,
      confirmations,
    );
  }

  public async setSupportedAsset(assetAddress: EthAddress, supportsPermit: boolean, options: SendTxOptions = {}) {
    const tx = await this.rollupProcessor.setSupportedAsset(assetAddress, supportsPermit, options);
    const tokenAsset = await TokenAsset.fromAddress(assetAddress, this.ethereumProvider, supportsPermit);
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
    const defiRoot = await this.rollupProcessor.defiRoot();

    const defiInteractionHash = await this.rollupProcessor.defiInteractionHash();

    const totalDeposited = await this.getAssetValues(this.rollupProcessor.totalDeposited());
    const totalWithdrawn = await this.getAssetValues(this.rollupProcessor.totalWithdrawn());
    const totalFees = await this.getAssetValues(this.rollupProcessor.totalFees());

    return {
      nextRollupId,
      dataRoot,
      nullRoot,
      rootRoot,
      defiRoot,
      dataSize,
      defiInteractionHash,
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
      feeDistributorBalance[i] = await this.feeDistributor.txFeeBalance(this.assets[i].getStaticInfo().address);
    }

    return {
      escapeOpen,
      numEscapeBlocksRemaining: blocksRemaining,
      totalPendingDeposit,
      feeDistributorBalance,
    };
  }

  public getRollupContractAddress() {
    return this.rollupProcessor.address;
  }

  public getFeeDistributorContractAddress() {
    return this.feeDistributor.address;
  }

  public async createEscapeHatchProofTx(proofData: Buffer, viewingKeys: ViewingKey[], signatures: Buffer[]) {
    return this.rollupProcessor.createEscapeHatchProofTx(proofData, viewingKeys, signatures);
  }

  public async createRollupProofTx(
    proofData: Buffer,
    signatures: Buffer[],
    viewingKeys: ViewingKey[],
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
    return this.rollupProcessor.sendTx(data, options);
  }

  public async estimateGas(data: Buffer) {
    const signer = this.provider.getSigner(0);
    const from = await signer.getAddress();
    const txRequest = {
      to: this.rollupProcessor.address.toString(),
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

  public async getChainId() {
    const { chainId } = await this.provider.getNetwork();
    return chainId;
  }

  public async getBlockNumber() {
    return this.provider.getBlockNumber();
  }

  public async signMessage(message: Buffer, address: EthAddress) {
    const signer = new Web3Signer(this.ethereumProvider);
    return signer.signMessage(message, address);
  }

  public async signTypedData(data: TypedData, address: EthAddress) {
    const signer = new Web3Signer(this.ethereumProvider);
    return signer.signTypedData(data, address);
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

  public async getBridgeId(address: EthAddress) {
    let info: { numOutputAssets: number; inputAsset: string; outputAssetA: string; outputAssetB: string };
    try {
      const contract = new Contract(address.toString(), DefiBridgeABI, this.provider);
      info = await contract.getInfo();

      const assetAddresses = this.getAssets().map(a => a.getStaticInfo().address);
      const getAssetIdOrThrow = (assetAddress: string) => {
        const id = assetAddresses.findIndex(a => a.equals(EthAddress.fromString(assetAddress)));
        if (id < 0) {
          throw new Error(`Unknown asset address: ${assetAddress}.`);
        }
        return id;
      };
      const inputAssetId = getAssetIdOrThrow(info.inputAsset);
      const outputAssetIdA = getAssetIdOrThrow(info.outputAssetA);
      const outputAssetIdB = info.numOutputAssets > 1 ? getAssetIdOrThrow(info.outputAssetB) : 0;
      return new BridgeId(address, info.numOutputAssets, inputAssetId, outputAssetIdA, outputAssetIdB);
    } catch (e) {
      return BridgeId.ZERO;
    }
  }

  public async getUserProofApprovalStatus(address: EthAddress, txId: Buffer) {
    return this.rollupProcessor.getProofApprovalStatus(address, txId);
  }

  public async isContract(address: EthAddress) {
    return (await this.provider.getCode(address.toString())) !== '0x';
  }

  public async getGasPrice() {
    return BigInt((await this.provider.getGasPrice()).toString());
  }
}

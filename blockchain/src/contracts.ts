import { TransactionResponse, TransactionReceipt } from '@ethersproject/abstract-provider';
import { Web3Provider } from '@ethersproject/providers';
import { EthAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/asset';
import { Contract, ethers } from 'ethers';
import { abi as RollupABI } from './artifacts/contracts/RollupProcessor.sol/RollupProcessor.json';
import { abi as FeeDistributorABI } from './artifacts/contracts/interfaces/IFeeDistributor.sol/IFeeDistributor.json';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { Block } from 'barretenberg/block_source';
import { EthereumProvider } from './ethereum_provider';
import { solidityFormatSignatures } from './solidity_format_signatures';
import { Asset, EthereumSignature, PermitArgs, SendTxOptions, TypedData } from 'barretenberg/blockchain';
import { TokenAsset } from './token_asset';
import { TxHash } from 'barretenberg/tx_hash';
import { EthAsset } from './eth_asset';

const fixEthersStackTrace = (err: Error) => {
  err.stack! += new Error().stack;
  throw err;
};

export class Contracts {
  private rollupProcessor: Contract;
  private feeDistributorContract!: Contract;
  private assets!: Asset[];
  private provider!: Web3Provider;

  constructor(private rollupContractAddress: EthAddress, ethereumProvider: EthereumProvider) {
    this.provider = new Web3Provider(ethereumProvider);
    this.rollupProcessor = new ethers.Contract(rollupContractAddress.toString(), RollupABI, this.provider);
  }

  public async init() {
    const feeDistributorContractAddress = await this.rollupProcessor.feeDistributor();
    this.feeDistributorContract = new ethers.Contract(feeDistributorContractAddress, FeeDistributorABI, this.provider);

    const assetAddresses = await this.getSupportedAssets();
    const tokenAssets = assetAddresses.map(addr => new TokenAsset(this.provider, addr));
    await Promise.all(tokenAssets.map(async (t, i) => t.init(this.rollupProcessor.getAssetPermitSupport(i + 1))));
    this.assets = [new EthAsset(this.provider), ...tokenAssets];
  }

  private async getSupportedAssets(): Promise<EthAddress[]> {
    const assetAddresses = await this.rollupProcessor.getSupportedAssets();
    return assetAddresses.map((a: string) => EthAddress.fromString(a));
  }

  public async setSupportedAsset(assetAddress: EthAddress, supportsPermit: boolean, signingAddress?: EthAddress) {
    const signer = signingAddress ? this.provider.getSigner(signingAddress.toString()) : this.provider.getSigner(0);
    const rollupProcessor = new Contract(this.rollupContractAddress.toString(), RollupABI, signer);
    const tx = await rollupProcessor.setSupportedAsset(assetAddress.toString(), supportsPermit);
    const tokenAsset = new TokenAsset(this.provider, assetAddress);
    await tokenAsset.init(supportsPermit);
    this.assets.push(tokenAsset);
    return TxHash.fromString(tx.hash);
  }

  private async getAssetValues(promise: Promise<string[]>) {
    const padding = Array<bigint>(this.assets.length).fill(BigInt(0));
    return [...(await promise).map(v => BigInt(v)), ...padding].slice(0, padding.length);
  }

  public async getPerRollupState() {
    const nextRollupId = +(await this.rollupProcessor.nextRollupId());
    const dataSize = +(await this.rollupProcessor.dataSize());
    const dataRoot = Buffer.from((await this.rollupProcessor.dataRoot()).slice(2), 'hex');
    const nullRoot = Buffer.from((await this.rollupProcessor.nullRoot()).slice(2), 'hex');
    const rootRoot = Buffer.from((await this.rollupProcessor.rootRoot()).slice(2), 'hex');

    const totalDeposited = await this.getAssetValues(this.rollupProcessor.getTotalDeposited());
    const totalWithdrawn = await this.getAssetValues(this.rollupProcessor.getTotalWithdrawn());
    const totalFees = await this.getAssetValues(this.rollupProcessor.getTotalFees());

    const feeDistributorBalance: bigint[] = [];
    for (let i = 0; i < this.assets.length; ++i) {
      feeDistributorBalance[i] = BigInt(await this.feeDistributorContract.txFeeBalance(i));
    }

    return {
      nextRollupId,
      dataRoot,
      nullRoot,
      rootRoot,
      dataSize,
      totalDeposited,
      totalWithdrawn,
      totalFees,
      feeDistributorBalance,
    };
  }

  public async getPerBlockState() {
    const [escapeOpen, blocksRemaining] = await this.rollupProcessor.getEscapeHatchStatus();
    const numEscapeBlocksRemaining = blocksRemaining.toNumber();
    const totalPendingDeposit = await this.getAssetValues(this.rollupProcessor.getTotalPendingDeposit());
    return {
      escapeOpen,
      numEscapeBlocksRemaining,
      totalPendingDeposit,
    };
  }

  public getRollupContractAddress() {
    return this.rollupContractAddress;
  }

  public getFeeDistributorContractAddress() {
    return EthAddress.fromString(this.feeDistributorContract.address);
  }

  public async createEscapeHatchProofTx(
    proofData: Buffer,
    viewingKeys: Buffer[],
    signatures: Buffer[],
    signingAddress?: EthAddress,
  ) {
    const signer = signingAddress ? this.provider.getSigner(signingAddress.toString()) : this.provider.getSigner(0);
    const rollupProcessor = new Contract(this.rollupContractAddress.toString(), RollupABI, signer);
    const formattedSignatures = solidityFormatSignatures(signatures);
    const tx = await rollupProcessor.populateTransaction
      .escapeHatch(`0x${proofData.toString('hex')}`, formattedSignatures, Buffer.concat(viewingKeys))
      .catch(fixEthersStackTrace);
    return Buffer.from(tx.data!.slice(2), 'hex');
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
    const rollupProcessor = new Contract(this.rollupContractAddress.toString(), RollupABI);
    const formattedSignatures = solidityFormatSignatures(signatures);
    const tx = await rollupProcessor.populateTransaction
      .processRollup(
        `0x${proofData.toString('hex')}`,
        formattedSignatures,
        Buffer.concat(viewingKeys),
        providerSignature,
        providerAddress.toString(),
        feeReceiver.toString(),
        feeLimit,
      )
      .catch(fixEthersStackTrace);
    return Buffer.from(tx.data!.slice(2), 'hex');
  }

  public async sendTx(data: Buffer, options: SendTxOptions = {}) {
    const { signingAddress, gasLimit } = options;
    const signer = signingAddress ? this.provider.getSigner(signingAddress.toString()) : this.provider.getSigner(0);
    const from = await signer.getAddress();
    const gasPrice = options.gasPrice || (await this.getGasPrice());
    const txRequest = {
      to: this.rollupContractAddress.toString(),
      from,
      gasLimit,
      gasPrice: `0x${gasPrice.toString(16)}`,
      data,
    };
    const txResponse = await signer.sendTransaction(txRequest);
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

  public async depositPendingFunds(
    assetId: AssetId,
    amount: bigint,
    depositorAddress: EthAddress,
    permitArgs?: PermitArgs,
  ) {
    const signer = this.provider.getSigner(depositorAddress.toString());
    const rollupProcessor = new Contract(this.rollupContractAddress.toString(), RollupABI, signer);
    if (permitArgs) {
      const tx = await rollupProcessor
        .depositPendingFundsPermit(
          assetId,
          amount,
          depositorAddress.toString(),
          this.rollupProcessor.address,
          permitArgs.approvalAmount,
          permitArgs.deadline,
          permitArgs.signature.v,
          permitArgs.signature.r,
          permitArgs.signature.s,
          { value: assetId === 0 ? amount : undefined },
        )
        .catch(fixEthersStackTrace);
      return TxHash.fromString(tx.hash);
    } else {
      const tx = await rollupProcessor
        .depositPendingFunds(assetId, amount, depositorAddress.toString(), {
          value: assetId === 0 ? amount : undefined,
        })
        .catch(fixEthersStackTrace);
      return TxHash.fromString(tx.hash);
    }
  }

  public async approveProof(address: EthAddress, proofHash: string) {
    const signer = this.provider.getSigner(address.toString());
    const rollupProcessor = new Contract(this.rollupContractAddress.toString(), RollupABI, signer);
    const tx = await rollupProcessor.approveProof(proofHash).catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  public async getRollupBlocksFrom(rollupId: number, minConfirmations: number) {
    const rollupFilter = this.rollupProcessor.filters.RollupProcessed(rollupId);
    const [rollupEvent] = await this.rollupProcessor.queryFilter(rollupFilter);
    if (!rollupEvent) {
      return [];
    }
    const filter = this.rollupProcessor.filters.RollupProcessed();
    const rollupEvents = await this.rollupProcessor.queryFilter(filter, rollupEvent.blockNumber);
    const txs = (await Promise.all(rollupEvents.map(event => event.getTransaction()))).filter(
      tx => tx.confirmations >= minConfirmations,
    );
    const receipts = await Promise.all(txs.map(tx => this.provider.getTransactionReceipt(tx.hash)));
    const blocks = await Promise.all(txs.map(tx => this.provider.getBlock(tx.blockNumber!)));
    return txs.map((tx, i) => this.decodeBlock({ ...tx, timestamp: blocks[i].timestamp }, receipts[0]));
  }

  public async getUserPendingDeposit(assetId: AssetId, account: EthAddress) {
    return BigInt(await this.rollupProcessor.getUserPendingDeposit(assetId, account.toString()));
  }

  private decodeBlock(tx: TransactionResponse, receipt: TransactionReceipt): Block {
    const rollupAbi = new ethers.utils.Interface(RollupABI);
    const result = rollupAbi.parseTransaction({ data: tx.data });
    const rollupProofData = Buffer.from(result.args.proofData.slice(2), 'hex');
    const viewingKeysData = Buffer.from(result.args.viewingKeys.slice(2), 'hex');

    return {
      created: new Date(tx.timestamp! * 1000),
      txHash: TxHash.fromString(tx.hash),
      rollupProofData,
      viewingKeysData,
      rollupId: RollupProofData.getRollupIdFromBuffer(rollupProofData),
      rollupSize: RollupProofData.getRollupSizeFromBuffer(rollupProofData),
      gasPrice: BigInt(tx.gasPrice.toString()),
      gasUsed: receipt.gasUsed.toNumber(),
    };
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

  public async signMessage(message: Buffer, address: EthAddress) {
    const signer = this.provider.getSigner(address.toString());
    const sig = await signer.signMessage(message);
    const signature = Buffer.from(sig.slice(2), 'hex');

    // Ganache is not signature standard compliant. Returns 00 or 01 as v.
    // Need to adjust to make v 27 or 28.
    const v = signature[signature.length - 1];
    if (v <= 1) {
      return Buffer.concat([signature.slice(0, -1), Buffer.from([v + 27])]);
    }

    return signature;
  }

  public async signTypedData({ domain, types, message }: TypedData, address: EthAddress) {
    const signer = this.provider.getSigner(address.toString());
    const result = await signer._signTypedData(domain, types, message);
    const signature = Buffer.from(result.slice(2), 'hex');
    const r = signature.slice(0, 32);
    const s = signature.slice(32, 64);
    const v = signature.slice(64, 65);
    const sig: EthereumSignature = { v, r, s };
    return sig;
  }

  public getAssets() {
    return this.assets;
  }

  public getAsset(assetId: AssetId) {
    return this.assets[assetId];
  }

  public async getUserProofApprovalStatus(address: EthAddress, proofHash: string) {
    const signer = this.provider.getSigner(address.toString());
    const rollupProcessor = new Contract(this.rollupContractAddress.toString(), RollupABI, signer);
    return await rollupProcessor.depositProofApprovals(address.toString(), proofHash);
  }

  public async isContract(address: EthAddress) {
    const result = await this.provider.getCode(address.toString());
    return result.toString() !== '0x';
  }

  public async getGasPrice() {
    return BigInt((await this.provider.getGasPrice()).toString());
  }
}

import { TransactionResponse, TransactionReceipt } from '@ethersproject/abstract-provider';
import { Web3Provider } from '@ethersproject/providers';
import { EthAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/asset';
import { TxHash } from 'barretenberg/rollup_provider';
import { Contract, ethers } from 'ethers';
import { abi as RollupABI } from './artifacts/contracts/RollupProcessor.sol/RollupProcessor.json';
import { abi as FeeDistributorABI } from './artifacts/contracts/interfaces/IFeeDistributor.sol/IFeeDistributor.json';
import { abi as ERC20ABI } from './artifacts/contracts/test/ERC20Mintable.sol/ERC20Mintable.json';
import { abi as ERC20PermitABI } from './artifacts/contracts/test/ERC20Permit.sol/ERC20Permit.json';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { Block } from 'barretenberg/block_source';
import { EthereumProvider } from './ethereum_provider';
import { solidityFormatSignatures } from './solidity_format_signatures';
import { PermitArgs } from 'barretenberg/blockchain';

const fixEthersStackTrace = (err: Error) => {
  err.stack! += new Error().stack;
  throw err;
};

export class Contracts {
  private rollupProcessor: Contract;
  private feeDistributorContract!: Contract;
  private erc20Contracts: Contract[] = [];
  private provider!: Web3Provider;

  constructor(private rollupContractAddress: EthAddress, private ethereumProvider: EthereumProvider) {
    this.provider = new Web3Provider(ethereumProvider);
    this.rollupProcessor = new ethers.Contract(rollupContractAddress.toString(), RollupABI, this.provider);
  }

  public async init() {
    const feeDistributorContractAddress = await this.rollupProcessor.feeDistributor();
    this.feeDistributorContract = new ethers.Contract(feeDistributorContractAddress, FeeDistributorABI, this.provider);

    const assetAddresses = await this.rollupProcessor.getSupportedAssets();
    this.erc20Contracts = await Promise.all(
      assetAddresses.map(async (a: any, index: number) => {
        const assetId = index + 1;
        const assetPermitSupport = await this.rollupProcessor.getAssetPermitSupport(assetId);
        const newContractABI = assetPermitSupport ? ERC20PermitABI : ERC20ABI;
        return new ethers.Contract(a, newContractABI, this.provider);
      }),
    );
  }

  public async getSupportedAssets(): Promise<EthAddress[]> {
    const assetAddresses = await this.rollupProcessor.getSupportedAssets();
    return assetAddresses.map((a: string) => EthAddress.fromString(a));
  }

  public async setSupportedAsset(assetAddress: EthAddress, supportsPermit: boolean, signingAddress?: EthAddress) {
    const signer = signingAddress ? this.provider.getSigner(signingAddress.toString()) : this.provider.getSigner(0);
    const rollupProcessor = new Contract(this.rollupContractAddress.toString(), RollupABI, signer);
    const tx = await rollupProcessor.setSupportedAsset(assetAddress.toString(), supportsPermit);
    const newContractABI = supportsPermit ? ERC20PermitABI : ERC20ABI;
    this.erc20Contracts.push(new ethers.Contract(assetAddress.toString(), newContractABI, this.provider));
    return TxHash.fromString(tx.hash);
  }

  public async getRollupStatus() {
    const nextRollupId = +(await this.rollupProcessor.nextRollupId());
    const dataSize = +(await this.rollupProcessor.dataSize());
    const dataRoot = Buffer.from((await this.rollupProcessor.dataRoot()).slice(2), 'hex');
    const nullRoot = Buffer.from((await this.rollupProcessor.nullRoot()).slice(2), 'hex');
    const rootRoot = Buffer.from((await this.rollupProcessor.rootRoot()).slice(2), 'hex');

    const padding = Array<bigint>(this.erc20Contracts.length + 1).fill(BigInt(0));
    const getAssetValues = async (promise: Promise<string[]>) =>
      [...(await promise).map(v => BigInt(v)), ...padding].slice(0, padding.length);

    const totalDeposited = await getAssetValues(this.rollupProcessor.getTotalDeposited());
    const totalWithdrawn = await getAssetValues(this.rollupProcessor.getTotalWithdrawn());
    const totalPendingDeposit = await getAssetValues(this.rollupProcessor.getTotalPendingDeposit());
    const totalFees = await getAssetValues(this.rollupProcessor.getTotalFees());

    const feeDistributorBalance: bigint[] = [];
    for (let i = 0; i < this.erc20Contracts.length + 1; ++i) {
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
      totalPendingDeposit,
      totalFees,
      feeDistributorBalance,
    };
  }

  public async getEscapeHatchStatus() {
    const [escapeOpen, blocksRemaining] = await this.rollupProcessor.getEscapeHatchStatus();
    const numEscapeBlocksRemaining = blocksRemaining.toNumber();
    return {
      escapeOpen,
      numEscapeBlocksRemaining,
    };
  }

  public async getEthBalance(account: EthAddress) {
    return BigInt(await this.provider.getBalance(account.toString()));
  }

  public getRollupContractAddress() {
    return this.rollupContractAddress;
  }

  public getFeeDistributorContractAddress() {
    return EthAddress.fromString(this.feeDistributorContract.address);
  }

  public getTokenContractAddresses() {
    return this.erc20Contracts.map(c => EthAddress.fromString(c.address));
  }

  /**
   * Send a proof to the rollup processor, which processes the proof and passes it to the verifier to
   * be verified.
   *
   * Appends viewingKeys to the proofData, so that they can later be fetched from the tx calldata
   * and added to the emitted rollupBlock.
   */
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

  /**
   * Send a proof to the rollup processor, which processes the proof and passes it to the verifier to
   * be verified, and refunds tx fee to feeReceiver.
   *
   * Appends viewingKeys to the proofData, so that they can later be fetched from the tx calldata
   * and added to the emitted rollupBlock.
   */
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

  public async sendTx(data: Buffer, signingAddress?: EthAddress, gasLimit?: number) {
    const signer = signingAddress ? this.provider.getSigner(signingAddress.toString()) : this.provider.getSigner(0);
    const from = await signer.getAddress();
    const txRequest = {
      to: this.rollupContractAddress.toString(),
      from,
      gasLimit,
      data,
    };
    const txResponse = await signer.sendTransaction(txRequest);
    return TxHash.fromString(txResponse.hash);
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

  public async getAssetBalance(assetId: AssetId, address: EthAddress): Promise<bigint> {
    if (assetId === AssetId.ETH) {
      return BigInt(await this.provider.getBalance(address.toString()));
    }
    return BigInt(await this.getAssetContract(assetId).balanceOf(address.toString()));
  }

  public async getAssetPermitSupport(assetId: AssetId): Promise<boolean> {
    if (assetId === AssetId.ETH) {
      false;
    }
    return this.rollupProcessor.getAssetPermitSupport(assetId);
  }

  public async getUserNonce(assetId: AssetId, address: EthAddress): Promise<bigint> {
    return BigInt(await this.getAssetContract(assetId).nonces(address.toString()));
  }

  public async getAssetAllowance(assetId: AssetId, address: EthAddress): Promise<bigint> {
    if (assetId === AssetId.ETH) {
      throw new Error('getAssetAllowance does not support ETH.');
    }
    return BigInt(
      await this.getAssetContract(assetId).allowance(address.toString(), this.rollupContractAddress.toString()),
    );
  }

  public async getAssetDecimals(assetId: AssetId): Promise<number> {
    if (assetId === AssetId.ETH) {
      return 18;
    }
    return +(await this.getAssetContract(assetId).decimals());
  }

  public async getAssetSymbol(assetId: AssetId): Promise<string> {
    if (assetId === AssetId.ETH) {
      return 'ETH';
    }
    return await this.getAssetContract(assetId).symbol();
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

  private getAssetContract(assetId: AssetId) {
    return this.erc20Contracts[assetId - 1];
  }
}

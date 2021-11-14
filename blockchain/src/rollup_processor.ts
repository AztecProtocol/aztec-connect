import { TransactionReceipt, TransactionResponse } from '@ethersproject/abstract-provider';
import { Web3Provider } from '@ethersproject/providers';
import { EthAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/asset';
import { PermitArgs } from 'barretenberg/blockchain';
import { Block } from 'barretenberg/block_source';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { TxHash } from 'barretenberg/tx_hash';
import { Contract, ethers, Signer } from 'ethers';
import { abi as RollupABI } from './artifacts/contracts/RollupProcessor.sol/RollupProcessor.json';
import { solidityFormatSignatures } from './solidity_format_signatures';

const fixEthersStackTrace = (err: Error) => {
  err.stack! += new Error().stack;
  throw err;
};

export class RollupProcessor {
  private rollupProcessor: Contract;

  constructor(private rollupContractAddress: EthAddress, private provider: Web3Provider) {
    this.rollupProcessor = new ethers.Contract(rollupContractAddress.toString(), RollupABI, this.provider);
  }

  get address() {
    return this.rollupContractAddress;
  }

  async feeDistributor() {
    return EthAddress.fromString(await this.rollupProcessor.feeDistributor());
  }

  async verifier() {
    return EthAddress.fromString(await this.rollupProcessor.verifier());
  }

  async nextRollupId() {
    return +(await this.rollupProcessor.nextRollupId());
  }

  async dataSize() {
    return +(await this.rollupProcessor.dataSize());
  }

  async dataRoot() {
    return Buffer.from((await this.rollupProcessor.dataRoot()).slice(2), 'hex');
  }

  async nullRoot() {
    return Buffer.from((await this.rollupProcessor.nullRoot()).slice(2), 'hex');
  }

  async rootRoot() {
    return Buffer.from((await this.rollupProcessor.rootRoot()).slice(2), 'hex');
  }

  async totalDeposited() {
    return ((await this.rollupProcessor.getTotalDeposited()) as string[]).map(v => BigInt(v));
  }

  async totalWithdrawn() {
    return ((await this.rollupProcessor.getTotalWithdrawn()) as string[]).map(v => BigInt(v));
  }

  async totalFees() {
    return ((await this.rollupProcessor.getTotalFees()) as string[]).map(v => BigInt(v));
  }

  async totalPendingDeposit() {
    return ((await this.rollupProcessor.getTotalPendingDeposit()) as string[]).map(v => BigInt(v));
  }

  async getSupportedAssets() {
    const assetAddresses: string[] = await this.rollupProcessor.getSupportedAssets();
    return assetAddresses.map((a: string) => EthAddress.fromString(a));
  }

  async setSupportedAsset(assetAddress: EthAddress, supportsPermit: boolean, signer?: EthAddress | Signer) {
    const rollupProcessor = this.getContractWithSigner(signer);
    const tx = await rollupProcessor.setSupportedAsset(assetAddress.toString(), supportsPermit);
    return TxHash.fromString(tx.hash);
  }

  async getAssetPermitSupport(assetId: AssetId): Promise<boolean> {
    return this.rollupProcessor.getAssetPermitSupport(assetId);
  }

  async getEscapeHatchStatus() {
    const [escapeOpen, blocksRemaining]: [boolean, any] = await this.rollupProcessor.getEscapeHatchStatus();
    return { escapeOpen, blocksRemaining: +blocksRemaining };
  }

  async createEscapeHatchProofTx(
    proofData: Buffer,
    viewingKeys: Buffer[],
    signatures: Buffer[],
    signer?: EthAddress | Signer,
  ) {
    const rollupProcessor = this.getContractWithSigner(signer);
    const formattedSignatures = solidityFormatSignatures(signatures);
    const tx = await rollupProcessor.populateTransaction
      .escapeHatch(`0x${proofData.toString('hex')}`, formattedSignatures, Buffer.concat(viewingKeys))
      .catch(fixEthersStackTrace);
    return Buffer.from(tx.data!.slice(2), 'hex');
  }

  async createRollupProofTx(
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

  async depositPendingFunds(assetId: AssetId, amount: bigint, permitArgs?: PermitArgs, signer?: EthAddress | Signer) {
    const rollupProcessor = this.getContractWithSigner(signer);
    const depositorAddress = await rollupProcessor.signer.getAddress();
    if (permitArgs) {
      const tx = await rollupProcessor
        .depositPendingFundsPermit(
          assetId,
          amount,
          depositorAddress,
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
        .depositPendingFunds(assetId, amount, depositorAddress, {
          value: assetId === 0 ? amount : undefined,
        })
        .catch(fixEthersStackTrace);
      return TxHash.fromString(tx.hash);
    }
  }

  async approveProof(proofHash: string, signer?: EthAddress | Signer) {
    const rollupProcessor = this.getContractWithSigner(signer);
    const tx = await rollupProcessor.approveProof(proofHash).catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async getUserPendingDeposit(assetId: AssetId, account: EthAddress) {
    return BigInt(await this.rollupProcessor.getUserPendingDeposit(assetId, account.toString()));
  }

  async getUserProofApprovalStatus(address: EthAddress, proofHash: string): Promise<boolean> {
    return await this.rollupProcessor.depositProofApprovals(address.toString(), proofHash);
  }

  async getRollupBlocksFrom(rollupId: number, minConfirmations: number) {
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
      gasPrice: BigInt(tx.gasPrice!.toString()),
      gasUsed: receipt.gasUsed.toNumber(),
    };
  }

  private getContractWithSigner(signer?: EthAddress | Signer) {
    const ethSigner = !signer
      ? this.provider.getSigner(0)
      : signer instanceof EthAddress
      ? this.provider.getSigner(signer.toString())
      : signer;
    return new Contract(this.rollupContractAddress.toString(), RollupABI, ethSigner);
  }
}

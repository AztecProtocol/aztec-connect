import { EthAddress } from '../address';
import { BlockSource } from '../block_source';
import { AssetId } from '../asset';
import { TxHash } from '../tx_hash';
import { BlockchainStatusSource } from './blockchain_status';

export * from './blockchain_status';

export interface Receipt {
  status: boolean;
  blockNum: number;
}

export type EthereumSignature = { v: Buffer; r: Buffer; s: Buffer };
export type PermitArgs = { deadline: bigint; approvalAmount: bigint; signature: EthereumSignature };

export interface Blockchain extends BlockSource, BlockchainStatusSource {
  getTransactionReceipt(txHash: TxHash): Promise<Receipt>;

  getUserPendingDeposit(assetId: AssetId, account: EthAddress): Promise<bigint>;

  validateSignature(publicOwner: EthAddress, signature: Buffer, proof: Buffer): boolean;

  depositPendingFunds(
    assetId: AssetId,
    amount: bigint,
    depositorAddress: EthAddress,
    permitArgs?: PermitArgs,
  ): Promise<TxHash>;

  createRollupProofTx(
    proof: Buffer,
    signatures: Buffer[],
    viewingKeys: Buffer[],
    providerSignature: Buffer,
    providerAddress: EthAddress,
    feeReceiver: EthAddress,
    feeLimit: bigint,
  ): Promise<Buffer>;

  createEscapeHatchProofTx(
    proofData: Buffer,
    viewingKeys: Buffer[],
    depositSignature?: Buffer,
    signingAddress?: EthAddress,
  ): Promise<Buffer>;

  sendTx(tx: Buffer): Promise<TxHash>;

  sendRollupProof(
    proof: Buffer,
    signatures: Buffer[],
    viewingKeys: Buffer[],
    providerSignature: Buffer,
    feeReceiver: EthAddress,
    feeLimit: bigint,
    providerAddress: EthAddress,
  ): Promise<TxHash>;

  sendEscapeHatchProof(
    proofData: Buffer,
    viewingKeys: Buffer[],
    depositSignature?: Buffer,
    signingAddress?: EthAddress,
  ): Promise<TxHash>;
}

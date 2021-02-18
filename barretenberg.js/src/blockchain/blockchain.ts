import { EthAddress } from '../address';
import { BlockSource } from '../block_source';
import { AssetId } from '../asset';
import { TxHash } from '../tx_hash';
import { BlockchainStatusSource } from './blockchain_status';
import { EthereumSignature, EthereumSigner } from './ethereum_signer';
import { Asset } from './asset';

export interface Receipt {
  status: boolean;
  blockNum: number;
}

export type PermitArgs = { deadline: bigint; approvalAmount: bigint; signature: EthereumSignature };

export interface Blockchain extends BlockSource, BlockchainStatusSource, EthereumSigner {
  getTransactionReceipt(txHash: TxHash): Promise<Receipt>;

  /**
   * Will consider if the escape hatch window is open or not, waiting additional confirmations if it is.
   */
  getTransactionReceiptSafe(txHash: TxHash): Promise<Receipt>;

  getUserPendingDeposit(assetId: AssetId, account: EthAddress): Promise<bigint>;

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

  getAsset(assetId: AssetId): Asset;

  isContract(address: EthAddress): Promise<boolean>;

  getUserProofApprovalStatus(address: EthAddress, proofData: Buffer): Promise<boolean>;
}

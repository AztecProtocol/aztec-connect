import { EthAddress } from '../address';
import { AssetId } from '../asset';
import { BlockSource } from '../block_source';
import { BridgeId } from '../client_proofs';
import { TxHash } from '../tx_hash';
import { Asset } from './asset';
import { BlockchainStatusSource } from './blockchain_status';
import { EthereumSignature, EthereumSigner } from './ethereum_signer';
import { PriceFeed } from './price_feed';

export interface Receipt {
  status: boolean;
  blockNum: number;
}

export interface SendTxOptions {
  gasPrice?: bigint;
  gasLimit?: number;
  signingAddress?: EthAddress;
}

export type PermitArgs = { deadline: bigint; approvalAmount: bigint; signature: EthereumSignature };

export interface Blockchain extends BlockSource, BlockchainStatusSource, EthereumSigner {
  getTransactionReceipt(txHash: TxHash): Promise<Receipt>;

  /**
   * Will consider if the escape hatch window is open or not, waiting additional confirmations if it is.
   */
  getTransactionReceiptSafe(txHash: TxHash): Promise<Receipt>;

  getUserPendingDeposit(assetId: AssetId, account: EthAddress): Promise<bigint>;

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

  sendTx(tx: Buffer, options?: SendTxOptions): Promise<TxHash>;

  getAsset(assetId: AssetId): Asset;

  getAssetPrice(assetId: AssetId): Promise<bigint>;

  getPriceFeed(assetId: AssetId): PriceFeed;

  getGasPriceFeed(): PriceFeed;

  isContract(address: EthAddress): Promise<boolean>;

  getUserProofApprovalStatus(address: EthAddress, proofData: Buffer): Promise<boolean>;

  getGasPrice(): Promise<bigint>;

  estimateGas(data: Buffer): Promise<number>;

  getBridgeId(address: EthAddress): Promise<BridgeId>;
}

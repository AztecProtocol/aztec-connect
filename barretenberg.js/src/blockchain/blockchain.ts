import { EthAddress } from '../address';
import { BlockSource } from '../block_source';
import { Asset } from './asset';
import { BlockchainStatusSource } from './blockchain_status';
import { EthereumProvider } from './ethereum_provider';
import { EthereumSignature, EthereumSigner } from './ethereum_signer';
import { PriceFeed } from './price_feed';
import { TxHash } from './tx_hash';

export interface Receipt {
  status: boolean;
  blockNum: number;
}

export interface SendTxOptions {
  gasLimit?: number;
  signingAddress?: EthAddress;
  provider?: EthereumProvider;
}

export interface FeeData {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  gasPrice: bigint;
}

export type PermitArgs = { deadline: bigint; approvalAmount: bigint; signature: EthereumSignature };

export interface Blockchain extends BlockSource, BlockchainStatusSource, EthereumSigner {
  getTransactionReceipt(txHash: TxHash): Promise<Receipt>;

  /**
   * Will consider if the escape hatch window is open or not, waiting additional confirmations if it is.
   */
  getTransactionReceiptSafe(txHash: TxHash): Promise<Receipt>;

  getUserPendingDeposit(assetId: number, account: EthAddress): Promise<bigint>;

  createRollupProofTx(proof: Buffer, signatures: Buffer[], offchainTxData: Buffer[]): Promise<Buffer>;

  sendTx(tx: Buffer, options?: SendTxOptions): Promise<TxHash>;

  getAsset(assetId: number): Asset;

  getAssetPrice(assetId: number): Promise<bigint>;

  getPriceFeed(assetId: number): PriceFeed;

  getGasPriceFeed(): PriceFeed;

  isContract(address: EthAddress): Promise<boolean>;

  getUserProofApprovalStatus(address: EthAddress, txId: Buffer): Promise<boolean>;

  estimateGas(data: Buffer): Promise<number>;

  getChainId(): Promise<number>;

  getRollupBalance(assetId: number): Promise<bigint>;

  getFeeDistributorBalance(assetId: number): Promise<bigint>;

  getFeeData(): Promise<FeeData>;

  getBridgeGas(bridgeId: bigint): bigint;
}

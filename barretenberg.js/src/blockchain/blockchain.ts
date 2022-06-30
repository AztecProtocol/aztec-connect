import { EthAddress } from '../address';
import { BlockSource } from '../block_source';
import { Asset } from './asset';
import { BlockchainStatusSource } from './blockchain_status';
import { EthereumProvider } from './ethereum_provider';
import { EthereumSigner } from './ethereum_signer';
import { PriceFeed } from './price_feed';
import { TxHash } from './tx_hash';

export interface RevertError {
  name: string;
  params: string[];
}

export interface Receipt {
  status: boolean;
  blockNum?: number;
  revertError?: RevertError;
}

export interface SendTxOptions {
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasLimit?: number;
  signingAddress?: EthAddress;
  provider?: EthereumProvider;
  nonce?: number;
}

export interface FeeData {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  gasPrice: bigint;
}

export interface RollupTxs {
  rollupProofTx: Buffer;
  offchainDataTxs: Buffer[];
}

export interface Blockchain extends BlockSource, BlockchainStatusSource, EthereumSigner {
  getProvider(): EthereumProvider;

  /*
   * Timeout is only considered for pending txs. i.e. If there is at least 1 confirmation, the timeout disables.
   */
  getTransactionReceipt(txHash: TxHash, timeoutSeconds?: number): Promise<Receipt>;

  /**
   * Will consider if the escape hatch window is open or not, waiting additional confirmations if it is.
   * Timeout is only considered for pending txs. i.e. If there is at least 1 confirmation, the timeout disables.
   */
  getTransactionReceiptSafe(txHash: TxHash, timeoutSeconds?: number): Promise<Receipt>;

  getUserPendingDeposit(assetId: number, account: EthAddress): Promise<bigint>;

  createRollupTxs(
    dataBuf: Buffer,
    signatures: Buffer[],
    offchainTxData: Buffer[],
    txCallDataLimit: number,
  ): Promise<RollupTxs>;

  sendTx(tx: Buffer, options?: SendTxOptions): Promise<TxHash>;

  getAsset(assetId: number): Asset;

  getAssetPrice(assetId: number): Promise<bigint>;

  getPriceFeed(assetId: number): PriceFeed;

  getGasPriceFeed(): PriceFeed;

  isContract(address: EthAddress): Promise<boolean>;

  /**
   * returns the EIP-161 definition of empty i.e. code == balance == nonce == 0
   * @param address The address to be queried
   */
  isEmpty(address: EthAddress): Promise<boolean>;

  getUserProofApprovalStatus(address: EthAddress, txId: Buffer): Promise<boolean>;

  estimateGas(data: Buffer): Promise<number>;

  getChainId(): Promise<number>;

  getRollupBalance(assetId: number): Promise<bigint>;

  getFeeData(): Promise<FeeData>;

  getBridgeGas(bridgeId: bigint): number;
}

import { EthAddress } from '../address/index.js';
import { BlockSource } from '../block_source/index.js';
import { Asset } from './asset.js';
import { BlockchainStatusSource } from './blockchain_status.js';
import { EthereumProvider } from './ethereum_provider.js';
import { EthereumSigner } from './ethereum_signer.js';
import { PriceFeed } from './price_feed.js';
import { TxHash } from './tx_hash.js';

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

export interface BridgeData {
  address: EthAddress;
  addressId: number;
  description: string;
}

export interface BridgeSubsidy {
  addressId: number;
  criteria: bigint;
  subsidyInWei: bigint;
  subsidyInGas: number;
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

  getBridgeGas(bridgeCallData: bigint): number;

  getBridgeSubsidy(bridgeCallData: bigint): Promise<BridgeSubsidy>;

  getBridgeData(bridgeAddressId: number): Promise<BridgeData>;
}

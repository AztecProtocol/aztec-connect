import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { Block } from '@aztec/barretenberg/block_source';
import {
  Blockchain,
  BlockchainStatus,
  EthereumProvider,
  Receipt,
  SendTxOptions,
  TypedData,
} from '@aztec/barretenberg/blockchain';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { EventEmitter } from 'events';
import { Contracts } from './contracts/contracts';
import { validateSignature } from './validate_signature';
import { WorldStateConstants } from '@aztec/barretenberg/world_state/world_state_constants';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';

export interface EthereumBlockchainConfig {
  console?: boolean;
  gasLimit?: number;
  minConfirmation?: number;
  minConfirmationEHW?: number;
  pollInterval?: number;
}

/**
 * Implementation of primary blockchain interface.
 * Provides higher level functionality above directly interfacing with contracts, e.g.:
 * - An asynchronous interface for subscribing to rollup events.
 * - A status query method for providing a complete snapshot of current rollup blockchain state.
 * - Abstracts away chain re-org concerns by ensuring appropriate confirmations for given situations.
 */
export class EthereumBlockchain extends EventEmitter implements Blockchain {
  private running = false;
  private runningPromise?: Promise<void>;
  private latestEthBlock = -1;
  private latestRollupId = -1;
  private status!: BlockchainStatus;
  private log = console.log;

  private static readonly DEFAULT_MIN_CONFIRMATIONS = 3;
  private static readonly DEFAULT_MIN_CONFIRMATIONS_EHW = 12;

  constructor(private config: EthereumBlockchainConfig, private contracts: Contracts) {
    super();
    this.status = {
      ...this.status,
      dataRoot: WorldStateConstants.EMPTY_DATA_ROOT,
      nullRoot: WorldStateConstants.EMPTY_NULL_ROOT,
      rootRoot: WorldStateConstants.EMPTY_ROOT_ROOT,
      defiRoot: WorldStateConstants.EMPTY_DEFI_ROOT,
    };
    if (config.console === false) {
      this.log = () => {};
    }
  }

  static async new(
    config: EthereumBlockchainConfig,
    rollupContractAddress: EthAddress,
    priceFeedContractAddresses: EthAddress[],
    provider: EthereumProvider,
  ) {
    const confirmations = config.minConfirmation || EthereumBlockchain.DEFAULT_MIN_CONFIRMATIONS;
    const contracts = await Contracts.fromAddresses(
      rollupContractAddress,
      priceFeedContractAddresses,
      provider,
      confirmations,
    );
    const eb = new EthereumBlockchain(config, contracts);
    await eb.init();
    return eb;
  }

  /**
   * Initialises the status object. Requires querying for the latest rollup block from the blockchain.
   * This could take some time given how `getRollupBlock` searches backwards over the chain.
   */
  public async init() {
    this.log('Seeking latest rollup...');
    const latestBlock = await this.contracts.getRollupBlock(-1);
    if (latestBlock) {
      this.log(`Found latest rollup id ${latestBlock.rollupId}.`);
    } else {
      this.log('No rollup found, assuming pristine state.');
    }
    await this.updatePerRollupState(latestBlock);
    await this.updatePerEthBlockState();
    const chainId = await this.contracts.getChainId();
    const assets = this.contracts.getAssets().map(a => a.getStaticInfo());
    this.status = {
      ...this.status,
      chainId,
      rollupContractAddress: this.contracts.getRollupContractAddress(),
      feeDistributorContractAddress: this.contracts.getFeeDistributorContractAddress(),
      verifierContractAddress: await this.contracts.getVerifierContractAddress(),
      assets,
    };
    this.log(`Ethereum blockchain initialized with assets: ${this.status.assets.map(a => a.symbol)}`);
  }

  /**
   * Start polling for RollupProcessed events.
   * All historical blocks will have been emitted before this function returns.
   */
  public async start(fromRollup = 0) {
    this.log(`Ethereum blockchain starting from rollup: ${fromRollup}`);

    const getBlocks = async (fromRollup: number) => {
      while (true) {
        try {
          return await this.getBlocks(fromRollup);
        } catch (err) {
          this.log(`getBlocks failed, will retry: ${err.message}`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    };

    const emitBlocks = async () => {
      const latestBlock = await this.contracts.getBlockNumber().catch(err => {
        this.log(`getBlockNumber failed: ${err.code}`);
        return this.latestEthBlock;
      });
      if (latestBlock === this.latestEthBlock) {
        return;
      }
      this.latestEthBlock = latestBlock;
      await this.updatePerEthBlockState();

      const blocks = await getBlocks(fromRollup);
      if (blocks.length) {
        await this.updatePerRollupState(blocks[blocks.length - 1]);
      }

      for (const block of blocks) {
        this.log(`Block received: ${block.rollupId}`);
        this.latestRollupId = block.rollupId;
        this.emit('block', block);
        fromRollup = block.rollupId + 1;
      }
    };

    // We must have emitted all historical blocks before returning.
    await emitBlocks();

    // After which, we asynchronously kick off a polling loop for the latest blocks.
    this.running = true;
    this.runningPromise = (async () => {
      while (this.running) {
        await new Promise(resolve => setTimeout(resolve, this.config.pollInterval || 10000));
        await emitBlocks().catch(this.log);
      }
    })();
  }

  /**
   * Stop polling for RollupProcessed events
   */
  public async stop() {
    this.running = false;
    this.removeAllListeners();
    await this.runningPromise;
  }

  /**
   * Get the status of the rollup contract
   */
  public async getBlockchainStatus() {
    return this.status;
  }

  private async updatePerRollupState(block?: Block) {
    this.status = {
      ...this.status,
      ...(await this.contracts.getPerRollupState()),
    };
    if (block) {
      const rollupProofData = RollupProofData.fromBuffer(block.rollupProofData);
      this.status = {
        ...this.status,
        nextRollupId: rollupProofData.rollupId + 1,
        dataSize: rollupProofData.dataStartIndex + rollupProofData.rollupSize,
        dataRoot: rollupProofData.newDataRoot,
        nullRoot: rollupProofData.newNullRoot,
        rootRoot: rollupProofData.newDataRootsRoot,
        defiRoot: rollupProofData.newDefiRoot,
      };
    }
  }

  private async updatePerEthBlockState() {
    this.status = {
      ...this.status,
      ...(await this.contracts.getPerBlockState()),
    };
  }

  public getLatestRollupId() {
    return this.latestRollupId;
  }

  public async getUserPendingDeposit(assetId: AssetId, account: EthAddress) {
    return this.contracts.getUserPendingDeposit(assetId, account);
  }

  public async getUserProofApprovalStatus(account: EthAddress, txId: Buffer) {
    return this.contracts.getUserProofApprovalStatus(account, txId);
  }

  public async createRollupProofTx(
    proofData: Buffer,
    signatures: Buffer[],
    offchainTxData: Buffer[],
    providerSignature: Buffer,
    providerAddress: EthAddress,
    feeReceiver: EthAddress,
    feeLimit: bigint,
  ) {
    return await this.contracts.createRollupProofTx(
      proofData,
      signatures,
      offchainTxData,
      providerSignature,
      providerAddress,
      feeReceiver,
      feeLimit,
    );
  }

  public async createEscapeHatchProofTx(proofData: Buffer, depositSignature?: Buffer, offchainTxData?: Buffer) {
    return await this.contracts.createEscapeHatchProofTx(
      proofData,
      depositSignature ? [depositSignature] : [],
      offchainTxData ? [offchainTxData] : [],
    );
  }

  public sendTx(tx: Buffer, options: SendTxOptions = {}) {
    options = { ...options, gasLimit: options.gasLimit || this.config.gasLimit };
    return this.contracts.sendTx(tx, options);
  }

  private getRequiredConfirmations() {
    const { escapeOpen, numEscapeBlocksRemaining } = this.status;
    const {
      minConfirmation = EthereumBlockchain.DEFAULT_MIN_CONFIRMATIONS,
      minConfirmationEHW = EthereumBlockchain.DEFAULT_MIN_CONFIRMATIONS_EHW,
    } = this.config;
    return escapeOpen || numEscapeBlocksRemaining <= minConfirmationEHW ? minConfirmationEHW : minConfirmation;
  }

  /**
   * Get all created rollup blocks from `rollupId`.
   */
  public async getBlocks(rollupId: number) {
    const minConfirmations = this.getRequiredConfirmations();
    return await this.contracts.getRollupBlocksFrom(rollupId, minConfirmations);
  }

  /**
   * Wait for given transaction to be mined, and return receipt.
   */
  public async getTransactionReceipt(txHash: TxHash) {
    const confs = this.config.minConfirmation || EthereumBlockchain.DEFAULT_MIN_CONFIRMATIONS;
    this.log(`Getting tx receipt for ${txHash}... (${confs} confirmations)`);
    let txReceipt = await this.contracts.getTransactionReceipt(txHash);
    while (!txReceipt || txReceipt.confirmations < confs) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      txReceipt = await this.contracts.getTransactionReceipt(txHash);
    }
    return { status: !!txReceipt.status, blockNum: txReceipt.blockNumber } as Receipt;
  }

  public async getTransactionReceiptSafe(txHash: TxHash) {
    const confs = this.getRequiredConfirmations();
    this.log(`Getting tx receipt for ${txHash} (${confs} confs)...`);
    let txReceipt = await this.contracts.getTransactionReceipt(txHash);
    while (!txReceipt || txReceipt.confirmations < confs) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      txReceipt = await this.contracts.getTransactionReceipt(txHash);
    }
    return { status: !!txReceipt.status, blockNum: txReceipt.blockNumber } as Receipt;
  }

  /**
   * Validate locally that a signature was produced by a publicOwner
   */
  public validateSignature(publicOwner: EthAddress, signature: Buffer, signingData: Buffer) {
    return validateSignature(publicOwner, signature, signingData);
  }

  public async signPersonalMessage(message: Buffer, address: EthAddress) {
    return this.contracts.signPersonalMessage(message, address);
  }

  public async signMessage(message: Buffer, address: EthAddress) {
    return this.contracts.signMessage(message, address);
  }

  public async signTypedData(data: TypedData, address: EthAddress) {
    return this.contracts.signTypedData(data, address);
  }

  public getAsset(assetId: AssetId) {
    return this.contracts.getAsset(assetId);
  }

  public async getAssetPrice(assetId: AssetId) {
    return this.contracts.getAssetPrice(assetId);
  }

  public getPriceFeed(assetId: AssetId) {
    return this.contracts.getPriceFeed(assetId);
  }

  public getGasPriceFeed() {
    return this.contracts.getGasPriceFeed();
  }

  public async getBridgeId(address: EthAddress) {
    return await this.contracts.getBridgeId(address);
  }

  public async isContract(address: EthAddress) {
    return this.contracts.isContract(address);
  }

  public async getGasPrice() {
    return this.contracts.getGasPrice();
  }

  public async estimateGas(data: Buffer) {
    return this.contracts.estimateGas(data);
  }

  public async getChainId() {
    return this.contracts.getChainId();
  }

  public getRollupBalance(assetId: number) {
    return this.contracts.getRollupBalance(assetId);
  }

  public getFeeDistributorBalance(assetId: number){
    return this.contracts.getFeeDistributorBalance(assetId);
  }
}

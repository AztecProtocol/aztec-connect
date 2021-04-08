import { EthereumProvider } from './ethereum_provider';
import { EthAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/asset';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { Blockchain, BlockchainStatus, Receipt, SendTxOptions, TypedData } from 'barretenberg/blockchain';
import { Contracts } from './contracts';
import { TxHash } from 'barretenberg/tx_hash';
import { validateSignature } from './validate_signature';
import { hashData } from './hash_data';

export interface EthereumBlockchainConfig {
  console?: boolean;
  gasLimit?: number;
  minConfirmation?: number;
  minConfirmationEHW?: number;
  pollInterval?: number;
}

export class EthereumBlockchain extends EventEmitter implements Blockchain {
  private running = false;
  private latestEthBlock = -1;
  private latestRollupId = -1;
  private debug: any;
  private status!: BlockchainStatus;

  private static readonly DEFAULT_MIN_CONFIRMATIONS = 3;
  private static readonly DEFAULT_MIN_CONFIRMATIONS_EHW = 12;

  constructor(private config: EthereumBlockchainConfig, private contracts: Contracts) {
    super();
    this.debug = config.console === false ? createDebug('bb:ethereum_blockchain') : console.log;
  }

  static async new(config: EthereumBlockchainConfig, rollupContractAddress: EthAddress, provider: EthereumProvider) {
    const confirmations = config.minConfirmation || EthereumBlockchain.DEFAULT_MIN_CONFIRMATIONS;
    const contracts = new Contracts(rollupContractAddress, provider, confirmations);
    await contracts.init();
    const eb = new EthereumBlockchain(config, contracts);
    await eb.init();
    return eb;
  }

  public async init() {
    await this.initStatus();
    this.debug(`Ethereum blockchain initialized with assets: ${this.status.assets.map(a => a.symbol)}`);
  }

  /**
   * Start polling for RollupProcessed events.
   * All historical blocks will have been emitted before this function returns.
   */
  public async start(fromRollup = 0) {
    this.debug(`Ethereum blockchain starting from rollup: ${fromRollup}`);

    const getBlocks = async (fromRollup: number) => {
      while (true) {
        try {
          return await this.getBlocks(fromRollup);
        } catch (err) {
          this.debug(`getBlocks failed, will retry: ${err.message}`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    };

    const emitBlocks = async () => {
      const latestBlock = await this.contracts.getBlockNumber().catch(err => {
        this.debug(`getBlockNumber failed: ${err.code}`);
        return this.latestEthBlock;
      });
      if (latestBlock === this.latestEthBlock) {
        return;
      }
      this.latestEthBlock = latestBlock;
      await this.updatePerBlockState();

      const blocks = await getBlocks(fromRollup);
      if (blocks.length) {
        await this.updatePerRollupState();
      }
      for (const block of blocks) {
        this.debug(`Block received: ${block.rollupId}`);
        this.latestRollupId = block.rollupId;
        this.emit('block', block);
        fromRollup = block.rollupId + 1;
      }
    };

    // We must have emitted all historical blocks before returning.
    await emitBlocks();

    // After which, we asynchronously kick off a polling loop for the latest blocks.
    this.running = true;
    (async () => {
      while (this.running) {
        await new Promise(resolve => setTimeout(resolve, this.config.pollInterval || 10000));
        await emitBlocks().catch(this.debug);
      }
    })();
  }

  /**
   * Stop polling for RollupProcessed events
   */
  public stop() {
    this.running = false;
    this.removeAllListeners();
  }

  /**
   * Get the status of the rollup contract
   */
  public async getBlockchainStatus(refresh = false) {
    if (refresh) {
      await this.initStatus();
    }
    return this.status;
  }

  private async initStatus() {
    await this.updatePerRollupState();
    await this.updatePerBlockState();
    const { chainId } = await this.contracts.getNetwork();

    const assets = this.contracts.getAssets().map(a => a.getStaticInfo());

    this.status = {
      ...this.status,
      chainId,
      rollupContractAddress: this.contracts.getRollupContractAddress(),
      feeDistributorContractAddress: this.contracts.getFeeDistributorContractAddress(),
      assets,
    };
  }

  private async updatePerRollupState() {
    this.status = {
      ...this.status,
      ...(await this.contracts.getPerRollupState()),
    };
  }

  private async updatePerBlockState() {
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

  public async getUserProofApprovalStatus(account: EthAddress, signingData: Buffer) {
    const proofHash = hashData(signingData);
    return this.contracts.getUserProofApprovalStatus(account, proofHash);
  }

  public async setSupportedAsset(assetAddress: EthAddress, supportsPermit: boolean, signingAddress: EthAddress) {
    return this.contracts.setSupportedAsset(assetAddress, supportsPermit, signingAddress);
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
    return await this.contracts.createRollupProofTx(
      proofData,
      signatures,
      viewingKeys,
      providerSignature,
      providerAddress,
      feeReceiver,
      feeLimit,
    );
  }

  public async createEscapeHatchProofTx(
    proofData: Buffer,
    viewingKeys: Buffer[],
    depositSignature?: Buffer,
    signingAddress?: EthAddress,
  ) {
    return await this.contracts.createEscapeHatchProofTx(
      proofData,
      viewingKeys,
      depositSignature ? [depositSignature] : [],
      signingAddress,
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
    this.debug(`Getting tx receipt for ${txHash}... (${confs} confirmations)`);
    let txReceipt = await this.contracts.getTransactionReceipt(txHash);
    while (!txReceipt || txReceipt.confirmations < confs) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      txReceipt = await this.contracts.getTransactionReceipt(txHash);
    }
    return { status: !!txReceipt.status, blockNum: txReceipt.blockNumber } as Receipt;
  }

  public async getTransactionReceiptSafe(txHash: TxHash) {
    const confs = this.getRequiredConfirmations();
    this.debug(`Getting tx receipt for ${txHash} (${confs} confs)...`);
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

  public async signMessage(message: Buffer, address: EthAddress) {
    return this.contracts.signMessage(message, address);
  }

  public async signTypedData(data: TypedData, address: EthAddress) {
    return this.contracts.signTypedData(data, address);
  }

  public getAsset(assetId: AssetId) {
    return this.contracts.getAsset(assetId);
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
}

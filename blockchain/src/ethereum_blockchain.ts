import { EthereumProvider } from './ethereum_provider';
import { EthAddress } from 'barretenberg/address';
import { Proof, RollupProviderStatus, TxHash } from 'barretenberg/rollup_provider';
import createDebug from 'debug';
import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import { Blockchain, PermitArgs, Receipt } from './blockchain';
import { Contracts } from './contracts';

export interface EthereumBlockchainConfig {
  networkOrHost: string;
  console?: boolean;
  gasLimit?: number;
  minConfirmation?: number;
  minConfirmationEHW?: number;
}

export class EthereumBlockchain extends EventEmitter implements Blockchain {
  private running = false;
  private latestEthBlock = -1;
  private latestRollupId = -1;
  private debug: any;
  private status!: RollupProviderStatus;

  constructor(private config: EthereumBlockchainConfig, private contracts: Contracts) {
    super();
    this.debug = config.console === false ? createDebug('bb:ethereum_blockchain') : console.log;
  }

  static async new(config: EthereumBlockchainConfig, rollupContractAddress: EthAddress, provider: EthereumProvider) {
    const contracts = new Contracts(rollupContractAddress, provider);
    await contracts.init();
    const eb = new EthereumBlockchain(config, contracts);
    await eb.init();
    return eb;
  }

  public async init() {
    await this.initStatus();
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
      await this.updateEscapeHatchStatus();

      const blocks = await getBlocks(fromRollup);
      if (blocks.length) {
        await this.updateRollupStatus();
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        await emitBlocks();
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
  public async getStatus() {
    return this.status;
  }

  private async initStatus() {
    await this.updateRollupStatus();
    await this.updateEscapeHatchStatus();
    const { chainId } = await this.contracts.getNetwork();
    const { networkOrHost } = this.config;

    this.status = {
      ...this.status,
      serviceName: 'ethereum',
      chainId,
      networkOrHost,
      tokenContractAddresses: this.getTokenContractAddresses(),
      rollupContractAddress: this.getRollupContractAddress(),
    };
  }

  private async updateRollupStatus() {
    this.status = {
      ...this.status,
      ...(await this.contracts.getRollupStatus()),
    };
  }

  private async updateEscapeHatchStatus() {
    this.status = {
      ...this.status,
      ...(await this.contracts.getEscapeHatchStatus()),
    };
  }

  public getLatestRollupId() {
    return this.latestRollupId;
  }

  public async getNetworkInfo() {
    const { chainId, networkOrHost } = this.status;
    return { chainId, networkOrHost };
  }

  public getRollupContractAddress() {
    return this.contracts.getRollupContractAddress();
  }

  public getTokenContractAddresses() {
    return this.contracts.getTokenContractAddresses();
  }

  public async getUserPendingDeposit(assetId: number, account: EthAddress) {
    return this.contracts.getUserPendingDeposit(assetId, account);
  }

  public async getUserNonce(assetId: number, account: EthAddress) {
    return this.contracts.getUserNonce(assetId, account);
  }

  public async setSupportedAsset(assetAddress: EthAddress, supportsPermit: boolean, signingAddress: EthAddress) {
    return this.contracts.setSupportedAsset(assetAddress, supportsPermit, signingAddress);
  }

  public async getAssetPermitSupport(assetId: number) {
    return this.contracts.getAssetPermitSupport(assetId);
  }

  /**
   * Deposit funds into the RollupProcessor contract. First stage of the two part deposit flow.
   * If the asset supports the permit() flow, deposit via the permit signature flow
   */
  public async depositPendingFunds(
    assetId: number,
    amount: bigint,
    depositorAddress: EthAddress,
    permitArgs?: PermitArgs,
  ) {
    return this.contracts.depositPendingFunds(assetId, amount, depositorAddress, permitArgs);
  }

  /**
   * Send a proof to the rollup processor, which processes the proof and passes it to the verifier to
   * be verified.
   *
   * Appends viewingKeys to the proofData, so that they can later be fetched from the tx calldata
   * and added to the emitted rollupBlock.
   */
  public async sendRollupProof(
    proofData: Buffer,
    signatures: Buffer[],
    sigIndexes: number[],
    viewingKeys: Buffer[],
    signingAddress?: EthAddress | undefined,
  ) {
    return await this.contracts.sendRollupProof(
      proofData,
      signatures,
      sigIndexes,
      viewingKeys,
      signingAddress,
      this.config.gasLimit,
    );
  }

  /**
   * This is called by the client side when in escape hatch mode. Hence it doesn't take deposit signatures.
   */
  public async sendProof({ proofData, viewingKeys, depositSignature }: Proof, signingAddress?: EthAddress) {
    return this.sendRollupProof(
      proofData,
      depositSignature ? [depositSignature] : [],
      depositSignature ? [0] : [],
      viewingKeys,
      signingAddress,
    );
  }

  private getRequiredConfirmations() {
    const { escapeOpen, numEscapeBlocksRemaining } = this.status;
    const { minConfirmation = 1, minConfirmationEHW: minConfirmationEHW = 12 } = this.config;
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
    this.debug(`Getting tx receipt for ${txHash}...`);
    let txReceipt = await this.contracts.getTransactionReceipt(txHash);
    while (!txReceipt || txReceipt.confirmations < this.getRequiredConfirmations()) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      txReceipt = await this.contracts.getTransactionReceipt(txHash);
    }
    return { status: !!txReceipt.status, blockNum: txReceipt.blockNumber } as Receipt;
  }

  /**
   * Check users have deposited sufficient numbers of tokens , for rollup deposits
   * to succeed
   */
  public async validateDepositFunds(inputOwner: EthAddress, publicInput: bigint, assetId: number) {
    const depositedBalance = BigInt(await this.contracts.getUserPendingDeposit(assetId, inputOwner));
    return depositedBalance >= publicInput;
  }

  /**
   * Validate locally that a signature was produced by a publicOwner
   */
  public validateSignature(publicOwner: EthAddress, signature: Buffer, signingData: Buffer) {
    const msgHash = ethers.utils.solidityKeccak256(['bytes'], [signingData]);
    const digest = ethers.utils.arrayify(msgHash);
    const recoveredSigner = ethers.utils.verifyMessage(digest, `0x${signature.toString('hex')}`);
    return recoveredSigner.toLowerCase() === publicOwner.toString().toLowerCase();
  }

  // TODO - shouldn't have to have this method here
  async getPendingNoteNullifiers() {
    return [];
  }
}

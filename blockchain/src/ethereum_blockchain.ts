import { Provider, TransactionResponse } from '@ethersproject/abstract-provider';
import { EthAddress } from 'barretenberg/address';
import { Block } from 'barretenberg/block_source';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { Proof, RollupProviderStatus } from 'barretenberg/rollup_provider';
import { toBigIntBE } from 'bigint-buffer';
import createDebug from 'debug';
import { Contract, ethers, Signer } from 'ethers';
import { EventEmitter } from 'events';
import { abi as ERC20ABI } from './artifacts/ERC20Mintable.json';
import { abi as RollupABI } from './artifacts/RollupProcessor.json';
import { Blockchain, Receipt } from './blockchain';

export interface EthereumBlockchainConfig {
  provider: Provider;
  signer?: Signer;
  networkOrHost: string;
  console?: boolean;
  gasLimit?: number;
}

export class EthereumBlockchain extends EventEmitter implements Blockchain {
  private rollupProcessor!: Contract;
  private erc20Contracts: Contract[] = [];
  private assetAddresses!: EthAddress[];
  private running = false;
  private latestRollupId = -1;
  private debug: any;
  private status_!: RollupProviderStatus;

  constructor(private config: EthereumBlockchainConfig, private rollupContractAddress: EthAddress) {
    super();
    this.rollupProcessor = new ethers.Contract(
      rollupContractAddress.toString(),
      RollupABI,
      this.config.signer || this.config.provider,
    );
    this.debug = config.console === false ? createDebug('bb:ethereum_blockchain') : console.log;
  }

  static async new(config: EthereumBlockchainConfig, rollupContractAddress: EthAddress) {
    const eb = new EthereumBlockchain(config, rollupContractAddress);
    await eb.init();
    return eb;
  }

  public async init() {
    this.assetAddresses = await this.rollupProcessor.getSupportedAssets();

    for (let i = 0; i < this.assetAddresses.length; i += 1) {
      this.erc20Contracts[i] = new ethers.Contract(this.assetAddresses[i].toString(), ERC20ABI, this.config.signer);
    }

    await this.updateStatus();
  }

  /**
   * Start polling for RollupProcessed events.
   * All historical blocks will have been emitted before this function returns.
   */
  public async start(fromBlock = 0) {
    this.debug(`Ethereum blockchain starting from block: ${fromBlock}`);

    const getBlocks = async (fromBlock: number) => {
      while (true) {
        try {
          return await this.getBlocks(fromBlock);
        } catch (err) {
          console.log(`getBlocks failed, will retry: ${err.message}`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    };

    let latestEthBlock = -1;
    const emitBlocks = async () => {
      const latestBlock = await this.config.provider.getBlockNumber().catch(err => {
        console.log(`getBlockNumber failed: ${err.code}`);
        return latestEthBlock;
      });
      if (latestBlock === latestEthBlock) {
        return;
      }
      latestEthBlock = latestBlock;
      await this.updateStatus();

      const blocks = await getBlocks(fromBlock);
      for (const block of blocks) {
        this.debug(`Block received: ${block.blockNum}`);
        this.latestRollupId = RollupProofData.getRollupIdFromBuffer(block.rollupProofData);
        this.emit('block', block);
        fromBlock = block.blockNum + 1;
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
  }

  /**
   * Get the status of the rollup contract
   */
  public async status() {
    return this.status_;
  }

  private updateStatus = async () => {
    const { chainId, networkOrHost } = await this.getNetworkInfo();
    const nextRollupId = +(await this.rollupProcessor.nextRollupId());
    const dataSize = +(await this.rollupProcessor.dataSize());
    const dataRoot = Buffer.from((await this.rollupProcessor.dataRoot()).slice(2), 'hex');
    const nullRoot = Buffer.from((await this.rollupProcessor.nullRoot()).slice(2), 'hex');
    const rootRoot = Buffer.from((await this.rollupProcessor.rootRoot()).slice(2), 'hex');
    const [escapeOpen, numEscapeBlocksRemaining] = await this.rollupProcessor.getEscapeHatchStatus();

    this.status_ = {
      serviceName: 'ethereum',
      chainId,
      networkOrHost,
      tokenContractAddresses: this.getTokenContractAddresses(),
      rollupContractAddress: this.getRollupContractAddress(),
      nextRollupId,
      dataRoot,
      nullRoot,
      rootRoot,
      dataSize,
      escapeOpen,
      numEscapeBlocksRemaining: numEscapeBlocksRemaining.toNumber(),
    };
  };

  public getLatestRollupId() {
    return this.latestRollupId;
  }

  public async getNetworkInfo() {
    const { networkOrHost } = this.config;
    const { chainId } = await this.config.provider!.getNetwork();
    const blockNumber = await this.config.provider!.getBlockNumber();
    return { chainId, networkOrHost, blockNumber };
  }

  public getRollupContractAddress() {
    return this.rollupContractAddress;
  }

  public getTokenContractAddresses() {
    return this.assetAddresses;
  }

  /**
   * Send a proof to the rollup processor, which processes the proof and passes it to the verifier to
   * be verified.
   *
   * Appends viewingKeys to the proofData, so that they can later be fetched from the tx calldata
   * and added to the emitted rollupBlock.
   */
  public async sendRollupProof(proofData: Buffer, signatures: Buffer[], sigIndexes: number[], viewingKeys: Buffer[]) {
    const formattedSignatures = this.solidityFormatSignatures(signatures);
    const tx = await this.rollupProcessor.processRollup(
      `0x${proofData.toString('hex')}`,
      formattedSignatures,
      sigIndexes,
      Buffer.concat(viewingKeys),
      { gasLimit: this.config.gasLimit },
    );
    return Buffer.from(tx.hash.slice(2), 'hex');
  }

  /**
   * This is called by the client side when in escape hatch mode. Hence it doesn't take deposit signatures.
   */
  public async sendProof({ proofData, viewingKeys, depositSignature }: Proof) {
    return this.sendRollupProof(
      proofData,
      depositSignature ? [depositSignature] : [],
      depositSignature ? [0] : [],
      viewingKeys,
    );
  }

  /**
   * Format all signatures into useful solidity format. EVM word size is 32bytes
   * and we're supplying a concatenated array of signatures - so need each ECDSA
   * param (v, r, s) to occupy 32 bytes.
   *
   * Zero left padding v by 31 bytes.
   */
  private solidityFormatSignatures(signatures: Buffer[]) {
    const paddedSignatures = signatures.map(currentSignature => {
      const v = currentSignature.slice(-1);
      return Buffer.concat([currentSignature.slice(0, 64), Buffer.alloc(31), v]);
    });
    return Buffer.concat(paddedSignatures);
  }

  /**
   * Get all created rollup blocks from block number 'from'.
   */
  public async getBlocks(from: number) {
    const filter = this.rollupProcessor.filters.RollupProcessed();
    const rollupEvents = await this.rollupProcessor.queryFilter(filter, from);
    const txs = await Promise.all(rollupEvents.map(event => event.getTransaction()));
    // When using infura, we get an inconsistent view of the chain, hence filtering pending blocks. Great service.
    return txs.filter(tx => tx.blockNumber).map(tx => this.createRollupBlock(tx));
  }

  /**
   * Wait for given transaction to be mined, and return receipt.
   */
  public async getTransactionReceipt(txHash: Buffer) {
    const txHashStr = `0x${txHash.toString('hex')}`;
    let txReceipt = await this.config.provider.getTransactionReceipt(txHashStr);
    if (!txReceipt) {
      this.debug(`Waiting for tx receipt for ${txHashStr}...`);
      while (!txReceipt || txReceipt.blockNumber === null) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        txReceipt = await this.config.provider.getTransactionReceipt(txHashStr);
      }
    }
    return { status: !!txReceipt.status, blockNum: txReceipt.blockNumber } as Receipt;
  }

  /**
   * Check users have sufficient balance and have sufficiently approved, for rollup deposits
   * to succeed
   *
   * Note: `publicOwner` corresponds to either the deposit or withdraw address, depending
   * on the tx
   */
  public async validateDepositFunds(publicOwnerBuf: Buffer, publicInputBuf: Buffer, assetId: number) {
    const publicOwner = `0x${publicOwnerBuf.toString('hex')}`;
    const publicInput = toBigIntBE(publicInputBuf);
    const erc20 = this.erc20Contracts[assetId];
    const erc20Balance = BigInt(await erc20.balanceOf(publicOwner));
    const erc20Approval = BigInt(await erc20.allowance(publicOwner, this.rollupProcessor.address));
    return erc20Balance >= publicInput && erc20Approval >= publicInput;
  }

  /**
   * Validate locally that a signature was produced by a publicOwner
   */
  public validateSignature(publicOwnerBuf: Buffer, signature: Buffer, signingData: Buffer) {
    const msgHash = ethers.utils.solidityKeccak256(['bytes'], [signingData]);
    const digest = ethers.utils.arrayify(msgHash);
    const recoveredSigner = ethers.utils.verifyMessage(digest, `0x${signature.toString('hex')}`);
    return recoveredSigner.toLowerCase() === `0x${publicOwnerBuf.toString('hex')}`;
  }

  /**
   * Create a rollup block, by pulling the transaction and associated data from a transaction hash
   * in which the 'RollupProcessed' event was emitted
   */
  private createRollupBlock(tx: TransactionResponse) {
    const { rollupSize, rollupProofData, viewingKeysData, created } = this.decodeTransactionData(tx);
    const rollupBlock: Block = {
      txHash: Buffer.from(tx.hash.slice(2), 'hex'),
      blockNum: tx.blockNumber!,
      rollupSize,
      rollupProofData,
      viewingKeysData,
      created,
    };
    return rollupBlock;
  }

  /**
   * Decode the calldata of a rollup transaction into it's constituent proof components
   */
  private decodeTransactionData(txObject: TransactionResponse) {
    const rollupAbi = new ethers.utils.Interface(RollupABI);
    const result = rollupAbi.parseTransaction(txObject);
    const rollupProofData = Buffer.from(result.args.proofData.slice(2), 'hex');
    const viewingKeysData = Buffer.from(result.args.viewingKeys.slice(2), 'hex');
    const rollupSize = RollupProofData.getRollupSizeFromBuffer(rollupProofData);

    return {
      rollupSize,
      rollupProofData,
      viewingKeysData,
      created: new Date(), // TODO - should be the time the block was created
    };
  }
}

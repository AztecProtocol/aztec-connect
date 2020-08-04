import { TransactionResponse } from '@ethersproject/abstract-provider';
import { Block } from 'barretenberg/block_source';
import { MemoryFifo } from 'barretenberg/fifo';
import { toBigIntBE } from 'bigint-buffer';
import createDebug from 'debug';
import { Contract, ethers, Event, Signer } from 'ethers';
import { EventEmitter } from 'events';
import { abi as ERC20ABI } from './artifacts/ERC20Mintable.json';
import { abi as RollupABI } from './artifacts/RollupProcessor.json';
import { Blockchain, Receipt } from './blockchain';
import { RollupProof } from './rollup_proof';

const debug = createDebug('bb:ethereum_blockchain');

export interface EthereumBlockchainConfig {
  signer: Signer;
  networkOrHost: string;
}

export class EthereumBlockchain extends EventEmitter implements Blockchain {
  private rollupProcessor!: Contract;
  private erc20!: Contract;
  private eventQueue = new MemoryFifo<Event>();
  private erc20Address!: string;
  private scalingFactor = 10000000000000000n;

  constructor(private config: EthereumBlockchainConfig, private rollupContractAddress: string) {
    super();
    this.rollupProcessor = new ethers.Contract(rollupContractAddress, RollupABI, this.config.signer);
  }

  /**
   * Start polling for RollupProcessed events
   */
  public async start(fromBlock: number = 0) {
    console.log(`Ethereum blockchain starting from block: ${fromBlock}`);
    this.erc20Address = await this.rollupProcessor.linkedToken();
    this.erc20 = new ethers.Contract(this.erc20Address, ERC20ABI, this.config.signer);

    const filter = this.rollupProcessor.filters.RollupProcessed();

    // Start queueing any blocks from present onwards.
    this.rollupProcessor.on(filter, (rollupId, newDataRoot, newNullRoot, event: Event) => this.eventQueue.put(event));

    // Load and emit all historical blocks starting `fromBlock`.
    const blocks = await this.getBlocks(fromBlock);
    for (const block of blocks) {
      this.emit('block', block);
    }
    const startFrom = blocks.length ? blocks[blocks.length - 1].blockNum : 0;

    // Start processing enqueued blocks.
    this.eventQueue.process(async event => {
      const tx = await event.getTransaction();
      // Discard any duplicates we may have received while emitting historical blocks.
      if (tx.blockNumber! <= startFrom) {
        return;
      }
      const block = await this.createRollupBlock(tx);
      this.emit('block', block);
    });
  }

  /**
   * Stop polling for RollupProcessed events
   */
  public stop() {
    this.eventQueue.cancel();
    this.rollupProcessor.removeAllListeners('RollupProcessed');
  }

  public async getNetworkInfo() {
    const { provider } = this.config.signer;
    const { networkOrHost } = this.config;
    const { chainId } = await provider!.getNetwork();
    return { chainId, networkOrHost };
  }

  public getRollupContractAddress() {
    return this.rollupContractAddress;
  }

  public getTokenContractAddress() {
    return this.erc20Address;
  }

  /**
   * Send a proof to the rollup processor, which processes the proof and passes it to the verifier to
   * be verified.
   *
   * Appends viewingKeys to the proofData, so that they can later be fetched from the tx calldata
   * and added to the emitted rollupBlock.
   */
  public async sendProof(
    proofData: Buffer,
    signatures: Buffer[],
    sigIndexes: number[],
    viewingKeys: Buffer[],
    rollupSize: number,
  ) {
    const formattedSignatures = this.solidityFormatSignatures(signatures);
    const tx = await this.rollupProcessor.processRollup(
      `0x${proofData.toString('hex')}`,
      formattedSignatures,
      sigIndexes,
      Buffer.concat(viewingKeys),
      rollupSize,
    );
    return Buffer.from(tx.hash.slice(2), 'hex');
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
    return Promise.all(
      rollupEvents.map(async event => {
        const tx = await event.getTransaction();
        return await this.createRollupBlock(tx);
      }),
    );
  }

  /**
   * Wait for given transaction to be mined, and return receipt.
   */
  public async getTransactionReceipt(txHash: Buffer) {
    const txHashStr = `0x${txHash.toString('hex')}`;
    const tx = await this.config.signer.provider!.getTransaction(txHashStr);
    const txReceipt = await tx.wait();
    if (!txReceipt.blockNumber) {
      throw new Error(`Failed to get valid receipt for {: $ }{txHashStr}`);
    }
    return { blockNum: txReceipt.blockNumber } as Receipt;
  }

  /**
   * Check users have sufficient balance and have sufficiently approved, for rollup deposits
   * to succeed
   *
   * Note: `publicOwner` corresponds to either the deposit or withdraw address, depending
   * on the tx
   */
  public async validateDepositFunds(publicOwnerBuf: Buffer, publicInputBuf: Buffer) {
    const publicOwner = `0x${publicOwnerBuf.toString('hex')}`;
    const publicInput = toBigIntBE(publicInputBuf) * this.scalingFactor;
    const erc20Balance = BigInt(await this.erc20.balanceOf(publicOwner));
    const erc20Approval = BigInt(await this.erc20.allowance(publicOwner, this.rollupProcessor.address));
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
  private async createRollupBlock(tx: TransactionResponse) {
    const {
      rollupId,
      newDataRoot,
      newNullRoot,
      numDataEntries,
      dataEntries,
      nullifiers,
      dataStartIndex,
      viewingKeys,
    } = this.decodeTransactionData(tx);

    const rollupBlock: Block = {
      txHash: Buffer.from(tx.hash.slice(2), 'hex'),
      blockNum: tx.blockNumber!,
      rollupId,
      dataRoot: newDataRoot,
      nullRoot: newNullRoot,
      dataStartIndex,
      numDataEntries,
      dataEntries,
      nullifiers,
      viewingKeys,
    };
    return rollupBlock;
  }

  /**
   * Decode the calldata of a rollup transaction into it's constituent proof components
   */
  private decodeTransactionData(txObject: TransactionResponse) {
    const rollupAbi = new ethers.utils.Interface(RollupABI);
    const result = rollupAbi.parseTransaction(txObject);
    const proofData = Buffer.from(result.args.proofData.slice(2), 'hex');
    const viewingData = Buffer.from(result.args.viewingKeys.slice(2), 'hex');
    const rollupSize = result.args.rollupSize.toNumber();

    const rollupProof = new RollupProof(Buffer.from(proofData));
    const { rollupId, newDataRoot, newNullRoot } = rollupProof;
    const dataStartIndex = rollupProof.dataStartIndex;
    const nullifiers: Buffer[] = [];
    const dataEntries: Buffer[] = [];

    rollupProof.innerProofData.forEach(dataSet => {
      nullifiers.push(dataSet.nullifier1);
      nullifiers.push(dataSet.nullifier2);
      dataEntries.push(dataSet.newNote1);
      dataEntries.push(dataSet.newNote2);
    });
    const numDataEntries = rollupSize * 2;

    const viewingKeysArray: Buffer[] = [];
    for (let i: number = 0; i < rollupProof.numTxs * 2 * 176; i += 176) {
      viewingKeysArray.push(viewingData.slice(i, i + 176));
    }

    return {
      rollupId,
      newDataRoot,
      newNullRoot,
      numDataEntries,
      dataEntries,
      dataStartIndex,
      nullifiers,
      viewingKeys: viewingKeysArray,
    };
  }
}

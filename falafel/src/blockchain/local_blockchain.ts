import { Block, Blockchain, Receipt, RollupProof } from 'blockchain';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import { Connection, Repository } from 'typeorm';
import { BlockDao } from '../entity/block';
import { blockDaoToBlock, blockToBlockDao } from './blockdao_convert';

export class LocalBlockchain extends EventEmitter implements Blockchain {
  private blockNum = 0;
  private dataStartIndex = 0;
  private blockRep!: Repository<BlockDao>;
  private blockchain: Block[] = [];
  private running = false;

  constructor(private connection: Connection, private rollupSize: number) {
    super();
  }

  public getRollupContractAddress() {
    return '';
  }

  public getTokenContractAddress() {
    return '';
  }

  public async start() {
    this.running = true;

    this.blockRep = this.connection.getRepository(BlockDao);

    this.blockchain = await this.loadBlocks();

    const [lastBlock] = this.blockchain.slice(-1);
    if (lastBlock) {
      const prevRollupSize = lastBlock.numDataEntries / 2;
      if (prevRollupSize !== this.rollupSize) {
        throw new Error(`Previous data on chain has a rollup size of ${prevRollupSize}.`);
      }
      this.blockNum = lastBlock.blockNum + 1;
      this.dataStartIndex = this.blockchain.length * this.rollupSize * 2;
    }

    console.log(`Local blockchain restored: (blocks: ${this.blockNum})`);
  }

  public stop() {
    this.running = false;
  }

  public async sendProof(proofData: Buffer, viewingKeys: Buffer[]) {
    if (!this.running) {
      throw new Error('Blockchain is not accessible.');
    }

    const tx = new RollupProof(proofData);
    const rollupId = tx.rollupId;

    if (tx.dataStartIndex !== this.dataStartIndex) {
      throw new Error(`Incorrect dataStartIndex. Expecting ${this.dataStartIndex}. Got ${tx.dataStartIndex}.`);
    }

    const txHash = randomBytes(32);
    const dataEntries = tx.innerProofData.map(p => [p.newNote1, p.newNote2]).flat();
    const nullifiers = tx.innerProofData.map(p => [p.nullifier1, p.nullifier2]).flat();
    const numDataEntries = this.rollupSize * 2;

    const block: Block = {
      txHash,
      blockNum: this.blockNum,
      rollupId,
      dataStartIndex: tx.dataStartIndex,
      numDataEntries,
      dataEntries,
      nullifiers,
      viewingKeys,
    };

    this.blockNum++;
    this.dataStartIndex += numDataEntries;
    this.blockchain.push(block);

    await this.saveBlock(block);

    await new Promise(resolve => setTimeout(resolve, 1000));

    return txHash;
  }

  public async getTransactionReceipt(txHash: Buffer) {
    const block = await this.blockRep.findOne({ txHash });
    if (!block) {
      throw new Error(`Block does not exist: ${txHash.toString('hex')}`);
    }

    return {
      blockNum: block.id,
    } as Receipt;
  }

  private async saveBlock(block: Block) {
    await this.blockRep.save(blockToBlockDao(block));
  }

  private async loadBlocks() {
    const blockDaos = await this.blockRep.find();
    return blockDaos.map(blockDaoToBlock);
  }

  public async getBlocks(from: number): Promise<Block[]> {
    return this.blockchain.slice(from);
  }

  public async validateDepositFunds(publicOwner: Buffer, publicInput: Buffer) {
    return true;
  }
}

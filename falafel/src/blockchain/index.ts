import { Block, BlockSource } from 'barretenberg/block_source';
import { EventEmitter } from 'events';
import { Connection, Repository } from 'typeorm';
import { BlockDao } from '../entity/block';
import { RollupProof } from './rollup_proof';

export interface ProofReceiver {
  sendProof(proof: Buffer, rollupId: number, rollupSize: number, viewingKeys: Buffer[]): Promise<void>;
}

export interface Blockchain extends BlockSource, ProofReceiver {
  getBlocks(from: number): Block[];
}

export class LocalBlockchain extends EventEmitter implements Blockchain {
  private blockNum = 0;
  private dataStartIndex = 0;
  private blockRep!: Repository<BlockDao>;
  private blockchain: Block[] = [];
  private running = false;

  constructor(private connection: Connection, private rollupSize: number) {
    super();
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

  public async sendProof(proofData: Buffer, rollupId: number, rollupSize: number, viewingKeys: Buffer[]) {
    if (!this.running) {
      return;
    }

    const tx = new RollupProof(proofData);

    if (rollupSize !== this.rollupSize) {
      throw new Error(`Inconsistent rollup size. Expecting ${this.rollupSize}. Got ${rollupSize}.`);
    }
    if (tx.dataStartIndex !== this.dataStartIndex) {
      console.log(`Incorrect dataStartIndex. Expecting ${this.dataStartIndex}. Got ${tx.dataStartIndex}.`);
      return;
    }

    const dataEntries = tx.innerProofData.map(p => [p.newNote1, p.newNote2]).flat();
    const nullifiers = tx.innerProofData.map(p => [p.nullifier1, p.nullifier2]).flat();
    const numDataEntries = rollupSize * 2;

    const block: Block = {
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

    await this.saveBlock(block, rollupId);

    this.emit('block', block);
  }

  private async saveBlock(block: Block, rollupId: number) {
    const blockDao = new BlockDao();
    blockDao.created = new Date();
    blockDao.id = block.blockNum;
    blockDao.rollupId = rollupId;
    blockDao.dataStartIndex = block.dataStartIndex;
    blockDao.numDataEntries = block.numDataEntries;
    blockDao.dataEntries = Buffer.concat(block.dataEntries);
    blockDao.nullifiers = Buffer.concat(block.nullifiers);
    blockDao.viewingKeys = Buffer.concat(block.viewingKeys);
    await this.blockRep.save(blockDao);
  }

  private async loadBlocks() {
    const blockDaos = await this.blockRep.find();
    return blockDaos.map(b => {
      const block: Block = {
        blockNum: b.id,
        rollupId: b.rollupId,
        dataStartIndex: b.dataStartIndex,
        numDataEntries: b.numDataEntries,
        dataEntries: [],
        nullifiers: [],
        viewingKeys: [],
      };
      for (let i = 0; i < b.dataEntries.length; i += 64) {
        block.dataEntries.push(b.dataEntries.slice(i, i + 64));
      }
      for (let i = 0; i < b.nullifiers.length; i += 16) {
        block.nullifiers.push(b.nullifiers.slice(i, i + 16));
      }
      for (let i = 0; i < b.viewingKeys.length; i += 176) {
        block.viewingKeys.push(b.viewingKeys.slice(i, i + 176));
      }
      return block;
    });
  }

  public getBlocks(from: number) {
    return this.blockchain.slice(from);
  }
}

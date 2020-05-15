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
  private blockRep!: Repository<BlockDao>;
  private blockchain: Block[] = [];

  constructor(private connection: Connection) {
    super();
  }

  public async init() {
    this.blockRep = this.connection.getRepository(BlockDao);

    this.blockchain = await this.loadBlocks();

    const [lastBlock] = this.blockchain.slice(-1);
    if (lastBlock) {
      this.blockNum = lastBlock.blockNum + 1;
    }

    console.log(`Local blockchain restored: (blocks: ${this.blockNum})`);
  }

  public async sendProof(proofData: Buffer, rollupId: number, rollupSize: number, viewingKeys: Buffer[]) {
    const tx = new RollupProof(proofData);
    const dataEntries = tx.innerProofData.map(p => [p.newNote1, p.newNote2]).flat();
    const nullifiers = tx.innerProofData.map(p => [p.nullifier1, p.nullifier2]).flat();

    const block: Block = {
      blockNum: this.blockNum,
      rollupId,
      dataStartIndex: tx.dataStartIndex,
      numDataEntries: rollupSize * 2,
      dataEntries,
      nullifiers,
      viewingKeys,
    };

    this.blockNum++;
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

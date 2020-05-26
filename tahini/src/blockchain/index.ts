import { EventEmitter } from 'events';
import { Connection, Repository } from 'typeorm';
import { BlockDao } from '../entity/block';

export interface Block {
    blockNum: number;
    dataStartIndex: number;
    dataEntries: Buffer[];
    nullifiers: Buffer[];
}

export interface Blockchain {
  getBlocks(from: number): Block[];
}

export class LocalBlockchain extends EventEmitter implements Blockchain {
  private blockNum = 0;
  private dataTreeSize = 0;
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
      this.dataTreeSize = lastBlock.dataStartIndex + lastBlock.dataEntries.length;
      this.blockNum = lastBlock.blockNum + 1;
    }
  }

  public async submitTx(data: Buffer[], nullifiers: Buffer[]) {
    const block: Block = {
      blockNum: this.blockNum,
      dataStartIndex: this.dataTreeSize,
      dataEntries: data,
      nullifiers: nullifiers,
    };

    this.blockNum++;
    this.dataTreeSize += 2;
    this.blockchain.push(block);

    await this.saveBlock(block);
    this.emit('block', block);
  }

  private async saveBlock(block: Block) {
    const blockDao = new BlockDao();
    blockDao.created = new Date();
    blockDao.id = block.blockNum;
    blockDao.dataStartIndex = block.dataStartIndex;
    blockDao.dataEntries = Buffer.concat(block.dataEntries);
    blockDao.nullifiers = Buffer.concat(block.nullifiers);
    await this.blockRep.save(blockDao);
  }

  private async loadBlocks() {
    const blockDaos = await this.blockRep.find();
    return blockDaos.map(b => {
      const block: Block = {
        blockNum: b.id,
        dataStartIndex: b.dataStartIndex,
        dataEntries: [],
        nullifiers: [],
      };
      for (let i = 0; i < b.dataEntries.length; i += 64) {
        block.dataEntries.push(b.dataEntries.slice(i, i + 64));
      }
      for (let i = 0; i < b.nullifiers.length; i += 16) {
        block.nullifiers.push(b.nullifiers.slice(i, i + 16));
      }
      return block;
    });
  }

  public getBlocks(from: number) {
    return this.blockchain.slice(from);
  }
}

import { MerkleTree } from '../merkle_tree';
import { LevelUp } from 'levelup';
import { Blake2s } from '../crypto/blake2s';
import { Pedersen } from '../crypto/pedersen';
import { BlockSource, Block } from '../block_source';
import { MemoryFifo } from '../fifo';
import { EventEmitter } from 'events';
import createDebug from 'debug';

const debug = createDebug('bb:world_state');

export class WorldState extends EventEmitter {
  private tree?: MerkleTree;

  private queue = new MemoryFifo<Block>();

  constructor(private db: LevelUp, private pedersen: Pedersen, private blake2s: Blake2s, private blockSource: BlockSource) {
    super();
    blockSource.on('block', (b) => this.queue.put(b));
  }

  public async start() {
    try {
      const prevTree = await MerkleTree.fromName(this.db, this.pedersen, this.blake2s, 'data');
      this.tree = prevTree;
    } catch (e) {
      this.tree = new MerkleTree(this.db, this.pedersen, this.blake2s, 'data', 32);
    }

    while (true) {
      const block = await this.queue.get();
      if (!block) {
        break;
      }
      debug('received block', block);
      for (let i = 0; i < block.dataEntries.length; ++i) {
        await this.tree.updateElement(block.dataStartIndex + i, block.dataEntries[i]);
      }
      this.emit('block', block);
    }
  }

  public stop() {
    this.queue.cancel();
    this.blockSource.removeAllListeners();
  }

  public async getHashPath(index: number) {
    if (!this.tree) {
      throw new Error('Tree is not initialized.');
    }
    return await this.tree.getHashPath(index);
  }

  public getRoot() {
    if (!this.tree) {
      throw new Error('Tree is not initialized.');
    }
    return this.tree.getRoot();
  }

  public async addClientElement(index: number, encryptedNote: Buffer) {
    if (!this.tree) {
      throw new Error('Tree is not initialized.');
    }
    await this.tree.updateElement(index, encryptedNote);
  }
}

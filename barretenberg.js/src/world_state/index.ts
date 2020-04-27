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
  private tree: MerkleTree;

  private queue = new MemoryFifo<Block>();

  constructor(db: LevelUp, pedersen: Pedersen, blake2s: Blake2s, private blockSource: BlockSource) {
    super();
    this.tree = new MerkleTree(db, pedersen, blake2s, 'data', 32);
    blockSource.on('block', (b) => this.queue.put(b));
  }

  public async start() {
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
    return await this.tree.getHashPath(index);
  }

  public getRoot() {
    return this.tree.getRoot();
  }

  public async addClientElement(index: number, encryptedNote: Buffer) {
    await this.tree.updateElement(index, encryptedNote);
  }
}

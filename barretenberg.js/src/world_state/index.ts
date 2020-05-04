import { MerkleTree } from '../merkle_tree';
import { LevelUp } from 'levelup';
import { Blake2s } from '../crypto/blake2s';
import { Pedersen } from '../crypto/pedersen';
import { Block } from '../block_source';
import createDebug from 'debug';

const debug = createDebug('bb:world_state');

export class WorldState {
  private tree!: MerkleTree;

  constructor(private db: LevelUp, private pedersen: Pedersen, private blake2s: Blake2s) {}

  public async init() {
    try {
      this.tree = await MerkleTree.fromName(this.db, this.pedersen, this.blake2s, 'data');
    } catch (e) {
      this.tree = new MerkleTree(this.db, this.pedersen, this.blake2s, 'data', 32);
    }
    debug(`data size: ${this.tree.getSize()}`);
    debug(`data root: ${this.tree.getRoot().toString('hex')}`);
  }

  public async processBlock(block: Block) {
    debug('processing block...', block);
    for (let i = 0; i < block.dataEntries.length; ++i) {
      await this.tree.updateElement(block.dataStartIndex + i, block.dataEntries[i]);
    }
    debug(`data size: ${this.tree.getSize()}`);
    debug(`data root: ${this.tree.getRoot().toString('hex')}`);
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

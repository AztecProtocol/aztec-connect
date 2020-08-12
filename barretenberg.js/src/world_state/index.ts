import { MerkleTree } from '../merkle_tree';
import { LevelUp } from 'levelup';
import { Blake2s } from '../crypto/blake2s';
import { Pedersen } from '../crypto/pedersen';
import { Block } from '../block_source';
import { RollupProofData } from '../rollup_proof';
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
    const { rollupSize, rollupProofData, viewingKeysData } = block;
    const rollup = RollupProofData.fromBuffer(rollupProofData, viewingKeysData);
    const { rollupId, dataStartIndex, innerProofData } = rollup;

    const dataSize = this.getSize();
    if (dataSize !== dataStartIndex) {
      debug(`skipping block ${rollupId}, dataSize != dataStartIndex: ${dataSize} != ${dataStartIndex}.`);
      return;
    }

    debug(`processing block ${block.blockNum} with rollup ${rollupId}...`);

    for (let i = 0; i < innerProofData.length; ++i) {
      await this.tree.updateElement(dataStartIndex + i * 2, innerProofData[i].newNote1);
      await this.tree.updateElement(dataStartIndex + i * 2 + 1, innerProofData[i].newNote2);
    }
    if (innerProofData.length < rollupSize) {
      await this.tree.updateElement(dataStartIndex + rollupSize * 2 - 1, Buffer.alloc(64, 0));
    }

    debug(`data size: ${this.tree.getSize()}`);
    debug(`data root: ${this.tree.getRoot().toString('hex')}`);
  }

  public async syncFromDb() {
    await this.tree.syncFromDb();
  }

  public async getHashPath(index: number) {
    return await this.tree.getHashPath(index);
  }

  public getRoot() {
    return this.tree.getRoot();
  }

  public getSize() {
    return this.tree.getSize();
  }
}

import { MerkleTree, MemoryMerkleTree, HashPath } from '../merkle_tree';
import { WorldStateConstants } from './world_state_constants';
import { LevelUp } from 'levelup';
import { Pedersen } from '../crypto/pedersen';
import { createDebugLogger } from '../log';

const debug = createDebugLogger('bb:world_state');

export class WorldState {
  private tree!: MerkleTree;
  private subTreeDepth = 0;

  constructor(private db: LevelUp, private pedersen: Pedersen) {}

  public async init(subTreeDepth: number) {
    const subTreeSize = 1 << subTreeDepth;
    this.subTreeDepth = subTreeDepth;
    const zeroNotes = Array(subTreeSize).fill(MemoryMerkleTree.ZERO_ELEMENT);
    const subTree = await MemoryMerkleTree.new(zeroNotes, this.pedersen);
    const treeSize = WorldStateConstants.DATA_TREE_DEPTH - subTreeDepth;
    const subTreeRoot = subTree.getRoot();
    debug(`initialising data tree with depth ${treeSize} and zero element of ${subTreeRoot.toString('hex')}`);
    try {
      this.tree = await MerkleTree.fromName(this.db, this.pedersen, 'data', subTreeRoot);
    } catch (e) {
      this.tree = await MerkleTree.new(this.db, this.pedersen, 'data', treeSize, subTreeRoot);
    }
    this.logTreeStats();
  }

  // builds a hash path at index 0 for a 'zero' tree of the given depth
  public buildZeroHashPath(depth = WorldStateConstants.DATA_TREE_DEPTH) {
    let current = MemoryMerkleTree.ZERO_ELEMENT;
    const bufs: Buffer[][] = [];
    for (let i = 0; i < depth; i++) {
      bufs.push([current, current]);
      current = this.pedersen.compress(current, current);
    }
    return new HashPath(bufs);
  }

  private convertNoteIndexToSubTreeIndex(noteIndex: number) {
    return noteIndex >> this.subTreeDepth;
  }

  public async buildFullHashPath(noteIndex: number, immutableHashPath: HashPath) {
    const noteSubTreeIndex = this.convertNoteIndexToSubTreeIndex(noteIndex);
    const mutablePath = await this.getHashPath(noteSubTreeIndex);
    const fullHashPath = new HashPath(immutableHashPath.data.concat(mutablePath.data));
    return fullHashPath;
  }

  public async insertElement(index: number, element: Buffer) {
    const subRootIndex = this.convertNoteIndexToSubTreeIndex(index);
    await this.tree.updateElement(subRootIndex, element);
    this.logTreeStats();
  }

  public async insertElements(startIndex: number, elements: Buffer[]) {
    const subRootIndex = this.convertNoteIndexToSubTreeIndex(startIndex);
    await this.tree.updateElements(subRootIndex, elements);
    this.logTreeStats();
  }

  public logTreeStats() {
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

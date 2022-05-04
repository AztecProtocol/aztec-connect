import { Hasher } from './hasher';
import { HashPath } from './hash_path';

/**
 * An 'in-memory' implementation of an immutable Merkle Tree
 * Is provided a set of values (size must be a power of 2) and hashes them into a tree
 * Will then provide the root, size and hash path on request
 */
export class MemoryMerkleTree {
  private hashes: Buffer[] = [];
  public static ZERO_ELEMENT = Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex');

  private constructor(private notes: Buffer[], private hasher: Hasher) {
    const isPowerOf2 = (v: number) => v && !(v & (v - 1));
    if (!isPowerOf2(notes.length)) {
      throw new Error('MemoryMerkleTree can only handle powers of 2.');
    }
  }

  public getHashPath(index: number) {
    if (index < 0 || index >= this.notes.length) {
      throw new Error('Index out of bounds');
    }
    if (!Number.isInteger(index)) {
      throw new Error('Index invalid');
    }
    const hashPath: Buffer[][] = [];
    let layerSize = this.notes.length;
    let offset = 0;
    while (layerSize > 1) {
      const hashIndex = index + offset;
      offset += layerSize;
      const hashes =
        index % 2
          ? [this.hashes[hashIndex - 1], this.hashes[hashIndex]]
          : [this.hashes[hashIndex], this.hashes[hashIndex + 1]];
      hashPath.push(hashes);
      index >>= 1;
      layerSize >>= 1;
    }
    return new HashPath(hashPath);
  }

  public getRoot() {
    return this.hashes[this.hashes.length - 1];
  }

  public getSize() {
    return this.notes.length;
  }

  public static async new(notes: Buffer[], hasher: Hasher) {
    const tree = new MemoryMerkleTree(notes, hasher);
    await tree.buildTree();
    return tree;
  }

  private async buildTree() {
    this.hashes = await this.hasher.hashToTree(this.notes);
  }
}

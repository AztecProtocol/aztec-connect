import { LevelUp, LevelUpChain } from 'levelup';
import { serializeBufferArrayToVector, deserializeArrayFromVector } from '../serialize';

const MAX_DEPTH = 32;
const LEAF_BYTES = 64;

/*
TODO: Maybe use these for bitshifts over 32 bits?
function lshift(num, bits) {
  return num * Math.pow(2,bits);
}

function rshift(num, bits) {
  return num / Math.pow(2,bits);
}
*/

function keepNLsb(input: number, numBits: number) {
  return numBits >= MAX_DEPTH ? input : input & ((1 << numBits) - 1);
}

export interface LeafHasher {
  compress(lhs: Uint8Array, rhs: Uint8Array): Buffer;
  hashToField(data: Uint8Array): Buffer;
  hashValuesToTree(values: Buffer[]): Buffer[];
}

export class HashPath {
  constructor(public data: Buffer[][] = []) {}

  public toBuffer() {
    const elements = this.data.map(nodes => Buffer.concat([nodes[0], nodes[1]]));
    return serializeBufferArrayToVector(elements);
  }

  static fromBuffer(buf: Buffer, offset = 0) {
    const { elem } = HashPath.deserialize(buf, offset);
    return elem;
  }

  static deserialize(buf: Buffer, offset = 0) {
    const deserializePath = (buf, offset) => ({
      elem: [buf.slice(offset, offset + 32), buf.slice(offset + 32, offset + 64)],
      adv: 64,
    });
    const { elem, adv } = deserializeArrayFromVector(deserializePath, buf, offset);
    return { elem: new HashPath(elem), adv };
  }
}

export class MerkleTree {
  private root!: Buffer;
  private zeroHashes: Buffer[] = [];

  constructor(
    private db: LevelUp,
    private leafHasher: LeafHasher,
    private name: string,
    private depth: number,
    private size: number = 0,
    root?: Buffer,
  ) {
    if (!(depth >= 1 && depth <= MAX_DEPTH)) {
      throw Error('Bad depth');
    }

    // Compute the zero values at each layer.
    let current = this.leafHasher.hashToField(Buffer.alloc(LEAF_BYTES, 0));
    for (let i = 0; i < depth; ++i) {
      this.zeroHashes[i] = current;
      current = leafHasher.compress(current, current);
    }

    this.root = root ? root : current;
  }

  static async new(db: LevelUp, leafHasher: LeafHasher, name: string, depth: number) {
    const tree = new MerkleTree(db, leafHasher, name, depth);
    await tree.writeMeta();

    return tree;
  }

  static async fromName(db: LevelUp, leafHasher: LeafHasher, name: string) {
    const meta: Buffer = await db.get(Buffer.from(name));
    const root = meta.slice(0, 32);
    const depth = meta.readUInt32LE(32);
    const size = meta.readUInt32LE(36);
    return new MerkleTree(db, leafHasher, name, depth, size, root);
  }

  public async syncFromDb() {
    const meta: Buffer = await this.db.get(Buffer.from(this.name));
    this.root = meta.slice(0, 32);
    this.depth = meta.readUInt32LE(32);
    this.size = meta.readUInt32LE(36);
  }

  private async writeMeta(batch?: LevelUpChain<string, Buffer>) {
    const data = Buffer.alloc(40);
    this.root.copy(data);
    data.writeUInt32LE(this.depth, 32);
    data.writeUInt32LE(this.size, 36);
    if (batch) {
      batch.put(this.name, data);
    } else {
      await this.db.put(this.name, data);
    }
  }

  public getRoot() {
    return this.root;
  }

  public getSize() {
    return this.size;
  }

  /**
   * Returns a hash path for the element at the given index.
   * The hash path is an array of pairs of hashes, with the lowest pair (leaf hashes) first, and the highest pair last.
   */
  public async getHashPath(index: number) {
    const path = new HashPath();

    let data = await this.dbGet(this.root);

    for (let i = this.depth - 1; i >= 0; --i) {
      if (!data) {
        // This is an empty subtree. Fill in zero value.
        path.data[i] = [this.zeroHashes[i], this.zeroHashes[i]];
        continue;
      }

      if (data.length > 64) {
        // Data is a subtree. Extract hash pair at height i.
        const subtreeDepth = i + 1;
        let layerSize = 2 ** subtreeDepth;
        let offset = 0;
        index = keepNLsb(index, subtreeDepth);
        for (let j = 0; j < subtreeDepth; ++j) {
          index -= index & 0x1;
          const lhsOffset = offset + index * 32;
          path.data[j] = [data.slice(lhsOffset, lhsOffset + 32), data.slice(lhsOffset + 32, lhsOffset + 64)];
          offset += layerSize * 32;
          layerSize >>= 1;
          index >>= 1;
        }
        break;
      }

      const lhs = data.slice(0, 32);
      const rhs = data.slice(32, 64);
      path.data[i] = [lhs, rhs];
      const isRight = (index >> i) & 0x1;
      data = await this.dbGet(isRight ? rhs : lhs);
    }

    return path;
  }

  public async updateElement(index: number, value: Buffer) {
    const batch = this.db.batch();
    const shaLeaf = this.leafHasher.hashToField(value);
    this.root = await this.updateElementInternal(this.root, shaLeaf, index, this.depth, batch);

    this.size = Math.max(this.size, index + 1);

    await this.writeMeta(batch);
    await batch.write();
  }

  private async updateElementInternal(
    root: Buffer,
    value: Buffer,
    index: number,
    height: number,
    batch: LevelUpChain<Buffer, Buffer>,
  ) {
    if (height === 0) {
      return value;
    }

    const data = await this.dbGet(root);
    const isRight = (index >> (height - 1)) & 0x1;

    let left = data ? data.slice(0, 32) : this.zeroHashes[height - 1];
    let right = data ? data.slice(32, 64) : this.zeroHashes[height - 1];
    const subtreeRoot = isRight ? right : left;
    const newSubtreeRoot = await this.updateElementInternal(
      subtreeRoot,
      value,
      keepNLsb(index, height - 1),
      height - 1,
      batch,
    );

    if (isRight) {
      right = newSubtreeRoot;
    } else {
      left = newSubtreeRoot;
    }
    const newRoot = this.leafHasher.compress(left, right);
    batch.put(newRoot, Buffer.concat([left, right]));
    if (!root.equals(newRoot)) {
      await batch.del(root);
    }
    return newRoot;
  }

  public async updateElements(index: number, values: Buffer[]) {
    const subtreeDepth = Math.ceil(Math.log2(values.length));
    const subtreeSize = 2 ** subtreeDepth;
    if (index % subtreeSize !== 0) {
      throw new Error(`Subtree insertion index must be a multiple of the subtree size being inserted.`);
    }
    if (index < this.size) {
      // Simply because we don't currently erase any existing data...
      throw new Error(`Subtree insertion must be in empty part of the tree.`);
    }
    values = values.concat(Array(subtreeSize - values.length).fill(Buffer.alloc(64, 0)));

    const hashes = this.leafHasher.hashValuesToTree(values);

    const batch = this.db.batch();
    this.root = await this.updateElementsInternal(this.root, hashes, index, this.depth, subtreeDepth, batch);

    this.size = Math.max(this.size, index + subtreeSize);

    await this.writeMeta(batch);
    await batch.write();
  }

  private async updateElementsInternal(
    root: Buffer,
    hashes: Buffer[],
    index: number,
    height: number,
    subtreeHeight: number,
    batch: LevelUpChain<Buffer, Buffer>,
  ) {
    if (height === subtreeHeight) {
      const root = hashes.pop()!;
      batch.put(root, Buffer.concat(hashes));
      return root;
    }

    const data = await this.dbGet(root);
    const isRight = (index >> (height - 1)) & 0x1;

    if (data && data.length > 64) {
      throw new Error('Attempting to update a subtree within a subtree not supported.');
    }

    let left = data ? data.slice(0, 32) : this.zeroHashes[height - 1];
    let right = data ? data.slice(32, 64) : this.zeroHashes[height - 1];
    const subtreeRoot = isRight ? right : left;
    const newSubtreeRoot = await this.updateElementsInternal(
      subtreeRoot,
      hashes,
      keepNLsb(index, height - 1),
      height - 1,
      subtreeHeight,
      batch,
    );

    if (isRight) {
      right = newSubtreeRoot;
    } else {
      left = newSubtreeRoot;
    }
    const newRoot = this.leafHasher.compress(left, right);
    batch.put(newRoot, Buffer.concat([left, right]));
    if (!root.equals(newRoot)) {
      await batch.del(root);
    }
    return newRoot;
  }

  private async dbGet(key: Buffer): Promise<Buffer | undefined> {
    return this.db.get(key).catch(() => {});
  }
}

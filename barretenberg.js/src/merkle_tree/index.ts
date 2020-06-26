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

export interface FieldCompressor {
  compress(lhs: Uint8Array, rhs: Uint8Array): Buffer;
}

export interface LeafHasher {
  hashToField(data: Uint8Array): Buffer;
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
    private fieldCompressor: FieldCompressor,
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
      current = fieldCompressor.compress(current, current);
    }

    this.root = root ? root : current;
  }

  static async new(db: LevelUp, fieldCompressor: FieldCompressor, leafHasher: LeafHasher, name: string, depth: number) {
    const tree = new MerkleTree(db, fieldCompressor, leafHasher, name, depth);
    await tree.writeMeta();

    return tree;
  }

  static async fromName(db: LevelUp, fieldCompressor: FieldCompressor, leafHasher: LeafHasher, name: string) {
    const meta: Buffer = await db.get(Buffer.from(name));
    const root = meta.slice(0, 32);
    const depth = meta.readUInt32LE(32);
    const size = meta.readUInt32LE(36);
    return new MerkleTree(db, fieldCompressor, leafHasher, name, depth, size, root);
  }

  async destroy() {
    await this.db.clear();
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

  public async getHashPath(index: number) {
    const path = new HashPath();

    let data = await this.dbGet(this.root);

    for (let i = this.depth - 1; i >= 0; --i) {
      if (!data) {
        // This is an empty subtree. Fill in zero value.
        path.data[i] = [this.zeroHashes[i], this.zeroHashes[i]];
        continue;
      }

      const lhs = data.slice(0, 32);
      const rhs = data.slice(32, 64);
      path.data[i] = [lhs, rhs];
      const isRight = (index >> i) & 0x1;
      data = await this.dbGet(isRight ? rhs : lhs);
    }

    return path;
  }

  public async getElement(index: number) {
    const leaf = await this.getElementInternal(this.root, index, this.depth);
    const data = await this.dbGet(leaf);
    return data ? data : Buffer.alloc(64, 0);
  }

  private async getElementInternal(root: Buffer, index: number, height: number): Promise<Buffer> {
    if (height === 0) {
      return root;
    }

    const data = await this.dbGet(root);

    if (!data) {
      return this.zeroHashes[0];
    }

    const isRight = (index >> (height - 1)) & 0x1;
    const subtreeRoot = isRight ? data.slice(32, 64) : data.slice(0, 32);
    return await this.getElementInternal(subtreeRoot, keepNLsb(index, height - 1), height - 1);
  }

  public async updateElement(index: number, value: Buffer) {
    const batch = this.db.batch();
    const shaLeaf = this.leafHasher.hashToField(value);
    this.root = await this.updateElementInternal(this.root, shaLeaf, index, this.depth, batch);
    await this.db.put(shaLeaf, value);

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
    const newRoot = this.fieldCompressor.compress(left, right);
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

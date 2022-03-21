"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerkleTree = exports.HashPath = void 0;
const serialize_1 = require("../serialize");
const MAX_DEPTH = 32;
function keepNLsb(input, numBits) {
    return numBits >= MAX_DEPTH ? input : input & ((1 << numBits) - 1);
}
class HashPath {
    constructor(data = []) {
        this.data = data;
    }
    toBuffer() {
        const elements = this.data.map(nodes => Buffer.concat([nodes[0], nodes[1]]));
        return (0, serialize_1.serializeBufferArrayToVector)(elements);
    }
    static fromBuffer(buf, offset = 0) {
        const { elem } = HashPath.deserialize(buf, offset);
        return elem;
    }
    static deserialize(buf, offset = 0) {
        const deserializePath = (buf, offset) => ({
            elem: [buf.slice(offset, offset + 32), buf.slice(offset + 32, offset + 64)],
            adv: 64,
        });
        const { elem, adv } = (0, serialize_1.deserializeArrayFromVector)(deserializePath, buf, offset);
        return { elem: new HashPath(elem), adv };
    }
}
exports.HashPath = HashPath;
class MerkleTree {
    constructor(db, hasher, name, depth, size = 0, root) {
        this.db = db;
        this.hasher = hasher;
        this.name = name;
        this.depth = depth;
        this.size = size;
        this.zeroHashes = [];
        if (!(depth >= 1 && depth <= MAX_DEPTH)) {
            throw Error('Bad depth');
        }
        // Compute the zero values at each layer.
        let current = MerkleTree.ZERO_ELEMENT;
        for (let i = 0; i < depth; ++i) {
            this.zeroHashes[i] = current;
            current = hasher.compress(current, current);
        }
        this.root = root ? root : current;
    }
    static async new(db, hasher, name, depth) {
        const tree = new MerkleTree(db, hasher, name, depth);
        await tree.writeMeta();
        return tree;
    }
    static async fromName(db, hasher, name) {
        const meta = await db.get(Buffer.from(name));
        const root = meta.slice(0, 32);
        const depth = meta.readUInt32LE(32);
        const size = meta.readUInt32LE(36);
        return new MerkleTree(db, hasher, name, depth, size, root);
    }
    async syncFromDb() {
        const meta = await this.db.get(Buffer.from(this.name));
        this.root = meta.slice(0, 32);
        this.depth = meta.readUInt32LE(32);
        this.size = meta.readUInt32LE(36);
    }
    async writeMeta(batch) {
        const data = Buffer.alloc(40);
        this.root.copy(data);
        data.writeUInt32LE(this.depth, 32);
        data.writeUInt32LE(this.size, 36);
        if (batch) {
            batch.put(this.name, data);
        }
        else {
            await this.db.put(this.name, data);
        }
    }
    getRoot() {
        return this.root;
    }
    getSize() {
        return this.size;
    }
    /**
     * Returns a hash path for the element at the given index.
     * The hash path is an array of pairs of hashes, with the lowest pair (leaf hashes) first, and the highest pair last.
     */
    async getHashPath(index) {
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
    async updateElement(index, value) {
        return this.updateLeafHash(index, value.equals(Buffer.alloc(32, 0)) ? MerkleTree.ZERO_ELEMENT : value);
    }
    async updateLeafHash(index, leafHash) {
        const batch = this.db.batch();
        this.root = await this.updateElementInternal(this.root, leafHash, index, this.depth, batch);
        this.size = Math.max(this.size, index + 1);
        await this.writeMeta(batch);
        await batch.write();
    }
    async updateElementInternal(root, value, index, height, batch) {
        if (height === 0) {
            return value;
        }
        const data = await this.dbGet(root);
        const isRight = (index >> (height - 1)) & 0x1;
        let left = data ? data.slice(0, 32) : this.zeroHashes[height - 1];
        let right = data ? data.slice(32, 64) : this.zeroHashes[height - 1];
        const subtreeRoot = isRight ? right : left;
        const newSubtreeRoot = await this.updateElementInternal(subtreeRoot, value, keepNLsb(index, height - 1), height - 1, batch);
        if (isRight) {
            right = newSubtreeRoot;
        }
        else {
            left = newSubtreeRoot;
        }
        const newRoot = this.hasher.compress(left, right);
        batch.put(newRoot, Buffer.concat([left, right]));
        if (!root.equals(newRoot)) {
            await batch.del(root);
        }
        return newRoot;
    }
    async updateElements(index, values) {
        const zeroBuf = Buffer.alloc(32, 0);
        return this.updateLeafHashes(index, values.map(v => (v.equals(zeroBuf) ? MerkleTree.ZERO_ELEMENT : v)));
    }
    /**
     * Updates all the given values, starting at index. This is optimal when inserting multiple values, as it can
     * compute a single subtree and insert it in one go.
     * However it comes with restrictions:
     * - The insertion index must be a multiple of the subtree size, which must be power of 2.
     * - The insertion index must be >= the current size of the tree (inserting into an empty location).
     *
     * We cannot over extend the tree size, as these inserts are bulk inserts, and a subsequent update would involve
     * a lot of complexity adjusting a previously inserted bulk insert. For this reason depending on the number of
     * values to insert, it will be chunked into the fewest number of subtrees required to grow the tree be precisely
     * that size. In normal operation (e.g. continuously inserting 64 values), we will be able to leverage single inserts.
     * Only when synching creates a non power of 2 set of values will the chunking mechanism come into play.
     * e.g. If we need insert 192 values, first a subtree of 128 is inserted, then a subtree of 64.
     */
    async updateLeafHashes(index, leafHashes) {
        while (leafHashes.length) {
            const batch = this.db.batch();
            let subtreeDepth = Math.ceil(Math.log2(leafHashes.length));
            let subtreeSize = 2 ** subtreeDepth;
            // We need to reduce the size of the subtree being inserted until it is:
            // a) Less than or equal in size to the number of values being inserted.
            // b) Fits in a subtree, with a size that is a multiple of the insertion index.
            while (leafHashes.length < subtreeSize || index % subtreeSize !== 0) {
                subtreeSize >>= 1;
                subtreeDepth--;
            }
            const toInsert = leafHashes.slice(0, subtreeSize);
            const hashes = await this.hasher.hashToTree(toInsert);
            this.root = await this.updateElementsInternal(this.root, hashes, index, this.depth, subtreeDepth, batch);
            // Slice off inserted values and adjust next insertion index.
            leafHashes = leafHashes.slice(subtreeSize);
            index += subtreeSize;
            this.size = index;
            await this.writeMeta(batch);
            await batch.write();
        }
    }
    async updateElementsInternal(root, hashes, index, height, subtreeHeight, batch) {
        if (height === subtreeHeight) {
            const root = hashes.pop();
            batch.put(root, Buffer.concat(hashes));
            return root;
        }
        // Do nothing if updating zero values.
        if (hashes[hashes.length - 1].equals(this.zeroHashes[height - 1])) {
            return root;
        }
        const data = await this.dbGet(root);
        const isRight = (index >> (height - 1)) & 0x1;
        if (data && data.length > 64) {
            if (!root.equals(hashes[hashes.length - 1])) {
                throw new Error('Attempting to update pre-existing subtree.');
            }
            return root;
        }
        let left = data ? data.slice(0, 32) : this.zeroHashes[height - 1];
        let right = data ? data.slice(32, 64) : this.zeroHashes[height - 1];
        const subtreeRoot = isRight ? right : left;
        const newSubtreeRoot = await this.updateElementsInternal(subtreeRoot, hashes, keepNLsb(index, height - 1), height - 1, subtreeHeight, batch);
        if (isRight) {
            right = newSubtreeRoot;
        }
        else {
            left = newSubtreeRoot;
        }
        const newRoot = this.hasher.compress(left, right);
        batch.put(newRoot, Buffer.concat([left, right]));
        if (!root.equals(newRoot)) {
            batch.del(root);
        }
        return newRoot;
    }
    async dbGet(key) {
        return this.db.get(key).catch(() => { });
    }
}
exports.MerkleTree = MerkleTree;
MerkleTree.ZERO_ELEMENT = Buffer.from('30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000000', 'hex');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbWVya2xlX3RyZWUvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsNENBQXdGO0FBRXhGLE1BQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQztBQUVyQixTQUFTLFFBQVEsQ0FBQyxLQUFhLEVBQUUsT0FBZTtJQUM5QyxPQUFPLE9BQU8sSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDckUsQ0FBQztBQVFELE1BQWEsUUFBUTtJQUNuQixZQUFtQixPQUFtQixFQUFFO1FBQXJCLFNBQUksR0FBSixJQUFJLENBQWlCO0lBQUcsQ0FBQztJQUVyQyxRQUFRO1FBQ2IsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3RSxPQUFPLElBQUEsd0NBQTRCLEVBQUMsUUFBUSxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVELE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBVyxFQUFFLE1BQU0sR0FBRyxDQUFDO1FBQ3ZDLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNuRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQVcsRUFBRSxNQUFNLEdBQUcsQ0FBQztRQUN4QyxNQUFNLGVBQWUsR0FBRyxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFD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
/// <reference types="node" />
import { LevelUp } from 'levelup';
export interface Hasher {
    compress(lhs: Uint8Array, rhs: Uint8Array): Buffer;
    hashToField(data: Uint8Array): Buffer;
    hashToTree(leaves: Buffer[]): Promise<Buffer[]>;
}
export declare class HashPath {
    data: Buffer[][];
    constructor(data?: Buffer[][]);
    toBuffer(): Buffer;
    static fromBuffer(buf: Buffer, offset?: number): HashPath;
    static deserialize(buf: Buffer, offset?: number): {
        elem: HashPath;
        adv: number;
    };
}
export declare class MerkleTree {
    private db;
    private hasher;
    private name;
    private depth;
    private size;
    static ZERO_ELEMENT: Buffer;
    private root;
    private zeroHashes;
    constructor(db: LevelUp, hasher: Hasher, name: string, depth: number, size?: number, root?: Buffer);
    static new(db: LevelUp, hasher: Hasher, name: string, depth: number): Promise<MerkleTree>;
    static fromName(db: LevelUp, hasher: Hasher, name: string): Promise<MerkleTree>;
    syncFromDb(): Promise<void>;
    private writeMeta;
    getRoot(): Buffer;
    getSize(): number;
    /**
     * Returns a hash path for the element at the given index.
     * The hash path is an array of pairs of hashes, with the lowest pair (leaf hashes) first, and the highest pair last.
     */
    getHashPath(index: number): Promise<HashPath>;
    updateElement(index: number, value: Buffer): Promise<void>;
    updateLeafHash(index: number, leafHash: Buffer): Promise<void>;
    private updateElementInternal;
    updateElements(index: number, values: Buffer[]): Promise<void>;
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
    updateLeafHashes(index: number, leafHashes: Buffer[]): Promise<void>;
    private updateElementsInternal;
    private dbGet;
}
//# sourceMappingURL=index.d.ts.map
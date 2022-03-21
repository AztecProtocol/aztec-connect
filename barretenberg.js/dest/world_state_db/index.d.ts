/// <reference types="node" />
import { HashPath } from '../merkle_tree';
export declare enum RollupTreeId {
    DATA = 0,
    NULL = 1,
    ROOT = 2,
    DEFI = 3
}
export interface PutEntry {
    treeId: number;
    index: bigint;
    value: Buffer;
}
export declare class WorldStateDb {
    private dbPath;
    private proc?;
    private stdout;
    private stdioQueue;
    private roots;
    private sizes;
    private binPath;
    constructor(dbPath?: string);
    start(): Promise<void>;
    stop(): void;
    getRoot(treeId: number): Buffer;
    getSize(treeId: number): bigint;
    get(treeId: number, index: bigint): Promise<Buffer>;
    private get_;
    getHashPath(treeId: number, index: bigint): Promise<HashPath>;
    private getHashPath_;
    put(treeId: number, index: bigint, value: Buffer): Promise<Buffer>;
    private put_;
    batchPut(entries: PutEntry[]): Promise<unknown>;
    private batchPut_;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    destroy(): void;
    private launch;
    private readMetadata;
    private processStdioQueue;
}
//# sourceMappingURL=index.d.ts.map
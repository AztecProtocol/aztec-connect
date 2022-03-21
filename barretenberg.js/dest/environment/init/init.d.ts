/// <reference types="node" />
import { WorldStateDb } from '../../world_state_db';
export interface AccountNotePair {
    note1: Buffer;
    note2: Buffer;
}
export interface AccountAlias {
    nonce: number;
    aliasHash: Buffer;
    address: Buffer;
}
export interface SigningKeys {
    signingKey1: Buffer;
    signingKey2: Buffer;
}
export interface Roots {
    dataRoot: Buffer;
    nullRoot: Buffer;
    rootsRoot: Buffer;
}
export interface AccountData {
    notes: AccountNotePair;
    nullifier: Buffer;
    alias: AccountAlias;
    signingKeys: SigningKeys;
}
export declare class InitHelpers {
    static getInitRoots(chainId: number): {
        initDataRoot: Buffer;
        initNullRoot: Buffer;
        initRootsRoot: Buffer;
    };
    static getInitDataSize(chainId: number): any;
    static getAccountDataFile(chainId: number): string | undefined;
    static getRootDataFile(chainId: number): string | undefined;
    static writeData(filePath: string, data: Buffer): Promise<number>;
    static readData(filePath: string): Promise<Buffer>;
    static writeAccountTreeData(accountData: AccountData[], filePath: string): Promise<number>;
    static parseAccountTreeData(data: Buffer): AccountData[];
    static readAccountTreeData(filePath: string): Promise<AccountData[]>;
    static populateDataAndRootsTrees(accounts: AccountData[], merkleTree: WorldStateDb, dataTreeIndex: number, rootsTreeIndex: number): Promise<{
        dataRoot: Buffer;
        rootsRoot: Buffer;
    }>;
    static populateNullifierTree(accounts: AccountData[], merkleTree: WorldStateDb, nullTreeIndex: number): Promise<Buffer>;
    static writeRoots(roots: Roots, filePath: string): Promise<number>;
    static readRoots(filePath: string): Promise<{
        dataRoot: Buffer;
        nullRoot: Buffer;
        rootsRoot: Buffer;
    } | undefined>;
}
//# sourceMappingURL=init.d.ts.map
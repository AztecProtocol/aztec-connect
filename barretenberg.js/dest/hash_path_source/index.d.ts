/// <reference types="node" />
import { HashPath } from '../merkle_tree';
export interface GetHashPathsResponse {
    oldRoot: Buffer;
    newRoots: Buffer[];
    oldHashPaths: HashPath[];
    newHashPaths: HashPath[];
}
export interface TreeState {
    root: Buffer;
    size: bigint;
}
export interface HashPathSource {
    getTreeState(treeIndex: number): Promise<TreeState>;
    getHashPath(treeIndex: number, index: bigint): Promise<HashPath>;
    getHashPaths(treeIndex: number, additions: {
        index: bigint;
        value: Buffer;
    }[]): Promise<GetHashPathsResponse>;
}
//# sourceMappingURL=index.d.ts.map
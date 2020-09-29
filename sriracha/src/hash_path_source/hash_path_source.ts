import { HashPath } from 'barretenberg/merkle_tree';
import { RollupProviderStatus } from 'barretenberg/rollup_provider';

export interface GetHashPathsResponse {
  oldRoot: Buffer;
  newRoots: Buffer[];
  oldHashPaths: HashPath[];
  newHashPaths: HashPath[];
}

export interface GetHashPathServerResponse {
  hashPath: string;
}

export interface GetHashPathsServerResponse {
  oldRoot: string;
  newRoots: string[];
  oldHashPaths: string[];
  newHashPaths: string[];
}

export interface GetTreeStateServerResponse {
  root: string;
  size: string;
}

export interface TreeState {
  root: Buffer;
  size: bigint;
}

export interface HashPathSource {
  status(): Promise<RollupProviderStatus>;
  getTreeState(treeIndex: number): Promise<TreeState>;
  getHashPath(treeIndex: number, index: bigint): Promise<HashPath>;
  getHashPaths(treeIndex: number, additions: { index: bigint; value: Buffer }[]): Promise<GetHashPathsResponse>;
}

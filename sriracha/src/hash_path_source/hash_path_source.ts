import { HashPath } from 'barretenberg/merkle_tree';

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

export interface HashPathSource {
  getHashPath(treeIndex: number, index: Buffer): Promise<HashPath>;
  getHashPaths(treeIndex: number, indicies: Buffer[]): Promise<GetHashPathsResponse>;
}

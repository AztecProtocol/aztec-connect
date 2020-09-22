import { EthAddress } from 'barretenberg/address';
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

export interface GetStatusServerResponse {
  chainId: number;
  networkOrHost: string;
  rollupContractAddress: string;
  tokenContractAddress: string;
  dataSize: string;
  dataRoot: string;
  nullRoot: string;
}

export interface GetStatusResponse {
  chainId: number;
  networkOrHost: string;
  rollupContractAddress: EthAddress;
  tokenContractAddress: EthAddress;
  dataSize: bigint;
  dataRoot: Buffer;
  nullRoot: Buffer;
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

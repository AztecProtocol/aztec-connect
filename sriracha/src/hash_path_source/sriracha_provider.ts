import { EthAddress } from 'barretenberg/address';
import { fetch } from 'barretenberg/iso_fetch';
import { HashPath } from 'barretenberg/merkle_tree';
import { toBufferBE } from 'bigint-buffer';
import {
  GetHashPathServerResponse,
  GetHashPathsServerResponse,
  GetStatusServerResponse,
  GetTreeStateServerResponse,
  HashPathSource,
} from './hash_path_source';

export class SrirachaProvider implements HashPathSource {
  constructor(private host: string) {}

  public async status() {
    const response = await fetch(`${this.host}/sriracha/get-status`);
    const {
      rollupContractAddress,
      tokenContractAddress,
      chainId,
      dataRoot,
      nullRoot,
      dataSize,
      networkOrHost,
    } = (await response.json()) as GetStatusServerResponse;
    return {
      rollupContractAddress: EthAddress.fromString(rollupContractAddress),
      tokenContractAddress: EthAddress.fromString(tokenContractAddress),
      chainId,
      dataRoot: Buffer.from(dataRoot, 'hex'),
      nullRoot: Buffer.from(nullRoot, 'hex'),
      dataSize: parseInt(dataSize, 10),
      networkOrHost,
    };
  }

  public async getTreeState(treeIndex: number) {
    const response = await fetch(`${this.host}/sriracha/get-tree-state/${treeIndex}`);
    const { size, root } = (await response.json()) as GetTreeStateServerResponse;
    return { root: Buffer.from(root, 'hex'), size: BigInt(size) };
  }

  public async getHashPath(treeIndex: number, index: bigint) {
    const response = await fetch(`${this.host}/sriracha/get-hash-path/${treeIndex}/${index.toString()}`);
    const { hashPath } = (await response.json()) as GetHashPathServerResponse;
    return HashPath.fromBuffer(Buffer.from(hashPath, 'hex'));
  }

  public async getHashPaths(treeIndex: number, additions: { index: bigint; value: Buffer }[]) {
    const body = additions.map(addition => {
      const { index, value } = addition;
      return { index: toBufferBE(index, 32).toString('hex'), value: value.toString('hex') };
    });
    const response = await fetch(`${this.host}/sriracha/get-hash-paths/${treeIndex}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const { oldRoot, newRoots, newHashPaths, oldHashPaths } = (await response.json()) as GetHashPathsServerResponse;
    return {
      oldRoot: Buffer.from(oldRoot, 'hex'),
      newHashPaths: newHashPaths.map((p: string) => HashPath.fromBuffer(Buffer.from(p, 'hex'))),
      oldHashPaths: oldHashPaths.map((p: string) => HashPath.fromBuffer(Buffer.from(p, 'hex'))),
      newRoots: newRoots.map((r: string) => Buffer.from(r, 'hex')),
    };
  }
}

import { fetch } from 'barretenberg/iso_fetch';
import { HashPath } from 'barretenberg/merkle_tree';
import { GetHashPathServerResponse, GetHashPathsServerResponse, HashPathSource } from './hash_path_source';

export class SrirachaProvider implements HashPathSource {
  constructor(private host: string) {}

  public async getHashPath(treeIndex: number, index: Buffer) {
    const response = await fetch(`${this.host}/api/get-hash-path/${treeIndex}/${index.toString('hex')}`);
    const { hashPath } = (await response.json()) as GetHashPathServerResponse;
    return HashPath.fromBuffer(Buffer.from(hashPath, 'hex'));
  }

  public async getHashPaths(treeIndex: number, nullifiers: Buffer[]) {
    const body = nullifiers.map(n => n.toString('hex'));
    const response = await fetch(`${this.host}/api/get-hash-paths/${treeIndex}`, {
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

import { HashPath } from 'barretenberg/merkle_tree';
import createDebug from 'debug';
import request from 'supertest';

const debug = createDebug('bb:sriracha-provider');

type NullifierResponse = {
  currentNullifierPaths: HashPath[];
  newNullifierPaths: HashPath[];
  nullifierMerkleRoot: Buffer;
  newNullifierRoots: Buffer[];
};

interface SrirachaProviderInterface {
  getNullifierPaths(nullifiers: string[]): Promise<NullifierResponse>;
  getAccountNullifierPath(nullfier: string): Promise<HashPath>;
}

export class SrirachaProvider implements SrirachaProviderInterface {
  public srirachaHost: URL;

  constructor(public srirachaHostStr: string, public api: any) {
    this.srirachaHost = new URL(srirachaHostStr);
    this.api = api;
  }

  public async getNullifierPaths(nullifiers: string[]) {
    const response = await (request(this.api) as any).get(`/api/getSequentialPaths/${nullifiers[0]}/${nullifiers[1]}`);
    const {
      hashPaths: { old: currentNullifierPaths, new: newNullifierPaths },
      oldRoot: nullifierMerkleRoot,
      roots: newNullifierRoots,
    } = response.body;

    currentNullifierPaths[0] = this.convertToHashPath(currentNullifierPaths[0].data);
    currentNullifierPaths[1] = this.convertToHashPath(currentNullifierPaths[1].data);
    newNullifierPaths[0] = this.convertToHashPath(newNullifierPaths[0].data);
    newNullifierPaths[1] = this.convertToHashPath(newNullifierPaths[1].data);

    return {
      newNullifierRoots: [Buffer.from(newNullifierRoots[0]), Buffer.from(newNullifierRoots[1])],
      nullifierMerkleRoot: Buffer.from(nullifierMerkleRoot),
      currentNullifierPaths: currentNullifierPaths as HashPath[],
      newNullifierPaths: newNullifierPaths as HashPath[],
    };
  }

  public async getAccountNullifierPath(nullifier: string) {
    const response = await (request(this.api) as any).get(`/api/getHashPath/${nullifier}`);
    const { hashPath } = response.body;
    return this.convertToHashPath(hashPath.data);
  }

  public convertToHashPath(nullifierPath: [][]) {
    const nullifierPathBufArray = nullifierPath.map((entry: object[]) => {
      return [Buffer.from(entry[0]), Buffer.from(entry[1])];
    });

    return new HashPath(nullifierPathBufArray);
  }
}

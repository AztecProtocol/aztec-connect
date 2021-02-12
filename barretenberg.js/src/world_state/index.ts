import { MerkleTree } from '../merkle_tree';
import { LevelUp } from 'levelup';
import { Pedersen } from '../crypto/pedersen';
import { RollupProofData } from '../rollup_proof';
import createDebug from 'debug';

const debug = createDebug('bb:world_state');

export class WorldState {
  private tree!: MerkleTree;

  constructor(private db: LevelUp, private pedersen: Pedersen) {}

  public async init() {
    try {
      this.tree = await MerkleTree.fromName(this.db, this.pedersen, 'data');
    } catch (e) {
      this.tree = await MerkleTree.new(this.db, this.pedersen, 'data', 32);
    }
    debug(`data size: ${this.tree.getSize()}`);
    debug(`data root: ${this.tree.getRoot().toString('hex')}`);
  }

  public async processRollup(rollup: RollupProofData) {
    const { rollupId, dataStartIndex, innerProofData } = rollup;

    debug(`processing rollup ${rollupId}...`);

    const leaves = innerProofData.map(p => [p.newNote1, p.newNote2]).flat();
    await this.tree.updateElements(dataStartIndex, leaves);

    debug(`data size: ${this.tree.getSize()}`);
    debug(`data root: ${this.tree.getRoot().toString('hex')}`);
  }

  public async processRollups(rollups: RollupProofData[]) {
    debug(`processing ${rollups.length} rollups from rollup ${rollups[0].rollupId}...`);

    const leaves: Buffer[] = [];
    for (const rollup of rollups) {
      if (rollup.dataStartIndex > leaves.length) {
        const padding = rollup.dataStartIndex - leaves.length;
        leaves.push(...new Array(padding).fill(Buffer.alloc(64, 0)));
      }
      leaves.push(...rollup.innerProofData.map(p => [p.newNote1, p.newNote2]).flat());
    }

    await this.tree.updateElements(rollups[0].dataStartIndex, leaves);

    debug(`data size: ${this.tree.getSize()}`);
    debug(`data root: ${this.tree.getRoot().toString('hex')}`);
  }

  public async syncFromDb() {
    await this.tree.syncFromDb();
  }

  public async getHashPath(index: number) {
    return await this.tree.getHashPath(index);
  }

  public getRoot() {
    return this.tree.getRoot();
  }

  public getSize() {
    return this.tree.getSize();
  }
}

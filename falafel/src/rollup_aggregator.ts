import { RollupProofData } from 'barretenberg/rollup_proof';
import { WorldStateDb } from 'barretenberg/world_state_db';
import { RollupDao } from './entity/rollup';
import { RollupProofDao } from './entity/rollup_proof';
import { ProofGenerator } from './proof_generator';
import { RootRollup } from './proof_generator/root_rollup';
import { RollupDb } from './rollup_db';
import { RollupPublisher } from './rollup_publisher';

export class RollupAggregator {
  constructor(
    private proofGenerator: ProofGenerator,
    private rollupPublisher: RollupPublisher,
    private rollupDb: RollupDb,
    private worldStateDb: WorldStateDb,
    private innerRollupSize: number,
    private outerRollupSize: number,
  ) {}

  /**
   * Checks the database for rollup proofs of `innerRollupSize`. When it finds enough inner proofs whos sizes sum to
   * `outerRollupSize`, constructs a rollup proof aggregating those rollup proofs, and replaces the inner proofs
   * with the single aggregated proof, updating the db as necessary.
   * @returns true if a proof is succesfully published.
   */
  public async aggregateRollupProofs(flush: boolean) {
    const innerProofs = await this.rollupDb.getRollupProofsBySize(this.innerRollupSize);
    const currentSize = innerProofs.length * this.innerRollupSize;

    console.log(`Aggregator current / required size: ${currentSize} / ${this.outerRollupSize}`);

    if (currentSize === this.outerRollupSize || flush) {
      const rootRollup = await this.createRootRollup(innerProofs);
      const proofData = await this.proofGenerator.createAggregateProof(rootRollup);

      if (!proofData) {
        throw new Error('Failed to create valid aggregate rollup.');
      }

      const rollupProofData = RollupProofData.fromBuffer(proofData);

      const rollupProofDao = new RollupProofDao();
      rollupProofDao.id = rollupProofData.rollupHash;
      // TypeOrm is bugged using Buffers as primaries, so there's an internalId that's a string.
      // I've mostly hidden this workaround in the entities but it's needed here.
      rollupProofDao.internalId = rollupProofData.rollupHash.toString('hex');
      rollupProofDao.txs = innerProofs.map(p => p.txs).flat();
      rollupProofDao.proofData = proofData;
      rollupProofDao.rollupSize = currentSize;
      rollupProofDao.created = new Date();
      rollupProofDao.dataStartIndex = innerProofs[0].dataStartIndex;

      const rollupDao = new RollupDao({
        id: rootRollup.rollupId,
        dataRoot: this.worldStateDb.getRoot(0),
        rollupProof: rollupProofDao,
        created: new Date(),
        viewingKeys: Buffer.concat(rollupProofDao.txs.map(tx => [tx.viewingKey1, tx.viewingKey2]).flat()),
      });

      await this.rollupDb.addRollup(rollupDao);

      await this.rollupDb.deleteTxlessRollupProofs();

      return await this.rollupPublisher.publishRollup(rollupDao);
    }

    return false;
  }

  private async createRootRollup(rollupProofs: RollupProofDao[]) {
    const worldStateDb = this.worldStateDb;

    // Get root tree data.
    const newDataRoot = worldStateDb.getRoot(0);
    const oldDataRootsRoot = worldStateDb.getRoot(2);
    const rootTreeSize = worldStateDb.getSize(2);
    const oldDataRootsPath = await worldStateDb.getHashPath(2, rootTreeSize);
    await worldStateDb.put(2, rootTreeSize, newDataRoot);
    const newDataRootsRoot = worldStateDb.getRoot(2);
    const newDataRootsPath = await worldStateDb.getHashPath(2, rootTreeSize);

    if (rollupProofs.length < this.outerRollupSize) {
      const endIndex = rollupProofs[0].dataStartIndex + this.innerRollupSize * this.outerRollupSize * 2 - 1;
      // Grows the data tree by inserting 0 at last subtree position.
      await worldStateDb.put(0, BigInt(endIndex), Buffer.alloc(64, 0));
    }

    const rootRollup = new RootRollup(
      await this.rollupDb.getNextRollupId(),
      rollupProofs.map(tx => tx.proofData),
      oldDataRootsRoot,
      newDataRootsRoot,
      oldDataRootsPath,
      newDataRootsPath,
    );

    return rootRollup;
  }

  public interrupt() {
    this.rollupPublisher.interrupt();
  }

  public clearInterrupt() {
    this.rollupPublisher.clearInterrupt();
  }
}

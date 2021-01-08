import { ProofData } from 'barretenberg/client_proofs/proof_data';
import { HashPath } from 'barretenberg/merkle_tree';
import { WorldStateDb } from 'barretenberg/world_state_db';
import { toBigIntBE, toBufferBE } from 'bigint-buffer';
import { RollupProofDao } from './entity/rollup_proof';
import { TxDao } from './entity/tx';
import { Metrics } from './metrics';
import { ProofGenerator, TxRollup } from './proof_generator';
import { RollupAggregator } from './rollup_aggregator';
import { RollupDb } from './rollup_db';

export class RollupCreator {
  constructor(
    private rollupDb: RollupDb,
    private worldStateDb: WorldStateDb,
    private proofGenerator: ProofGenerator,
    private rollupAggregator: RollupAggregator,
    private rollupSize: number,
    private metrics: Metrics,
  ) {}

  /**
   * Creates a rollup from the given txs and publishes it.
   * @returns true if successfully published, otherwise false.
   */
  public async create(txs: TxDao[], flush: boolean) {
    if (txs.length) {
      const rollup = await this.createRollup(txs);

      console.log(`Creating proof for rollup ${rollup.rollupHash.toString('hex')} with ${txs.length} txs...`);
      const end = this.metrics.txRollupTimer();
      const proof = await this.proofGenerator.createTxRollupProof(rollup);
      end();

      if (!proof) {
        // TODO: Once we correctly handle interrupts, this is not a panic scenario.
        throw new Error('Failed to create proof. This should not happen.');
      }

      const rollupProofDao = new RollupProofDao({
        id: rollup.rollupHash,
        txs,
        proofData: proof,
        rollupSize: this.rollupSize,
        dataStartIndex: rollup.dataStartIndex,
        created: new Date(),
      });

      await this.rollupDb.addRollupProof(rollupProofDao);
    }

    return await this.rollupAggregator.aggregateRollupProofs(flush);
  }

  /**
   * If a call to `create` is in progress, this will cause it to return early.
   * Currently the call to `proofGenerator.interrupt()` does nothing, so if a proofs being created the caller
   * of `create` will have to wait until it completes.
   * A call to `clearInterrupt` is required before you can continue creating rollups.
   */
  public interrupt() {
    this.proofGenerator.interrupt();
    this.rollupAggregator.interrupt();
  }

  public clearInterrupt() {
    this.proofGenerator.clearInterrupt();
    this.rollupAggregator.clearInterrupt();
  }

  private async createRollup(txs: TxDao[]) {
    const worldStateDb = this.worldStateDb;
    const dataSize = worldStateDb.getSize(0);
    const rollupSizePow2 = 1 << Math.ceil(Math.log2(this.rollupSize));
    const subtreeSize = BigInt(rollupSizePow2 * 2);
    const dataStartIndex = dataSize % subtreeSize === 0n ? dataSize : dataSize + subtreeSize - (dataSize % subtreeSize);

    // Get old data.
    const oldDataRoot = worldStateDb.getRoot(0);
    const oldDataPath = await worldStateDb.getHashPath(0, dataStartIndex);
    const oldNullRoot = worldStateDb.getRoot(1);

    // Insert each txs elements into the db (modified state will be thrown away).
    let nextDataIndex = dataStartIndex;
    const newNullRoots: Buffer[] = [];
    const oldNullPaths: HashPath[] = [];
    const newNullPaths: HashPath[] = [];
    const dataRootsPaths: HashPath[] = [];
    const dataRootsIndicies: number[] = [];

    for (const tx of txs) {
      const proof = new ProofData(tx.proofData);
      await worldStateDb.put(0, nextDataIndex++, proof.newNote1);
      await worldStateDb.put(0, nextDataIndex++, proof.newNote2);
      const nullifier1 = toBigIntBE(proof.nullifier1);
      const nullifier2 = toBigIntBE(proof.nullifier2);

      oldNullPaths.push(await worldStateDb.getHashPath(1, nullifier1));
      await worldStateDb.put(1, nullifier1, toBufferBE(1n, 64));
      newNullRoots.push(worldStateDb.getRoot(1));
      newNullPaths.push(await worldStateDb.getHashPath(1, nullifier1));

      oldNullPaths.push(await worldStateDb.getHashPath(1, nullifier2));
      await worldStateDb.put(1, nullifier2, toBufferBE(1n, 64));
      newNullRoots.push(worldStateDb.getRoot(1));
      newNullPaths.push(await worldStateDb.getHashPath(1, nullifier2));

      dataRootsPaths.push(await worldStateDb.getHashPath(2, BigInt(tx.dataRootsIndex)));
      dataRootsIndicies.push(tx.dataRootsIndex!);
    }

    if (txs.length < this.rollupSize) {
      // Grows the data tree by inserting 0 at last subtree position.
      await worldStateDb.put(0, dataStartIndex + BigInt(this.rollupSize) * 2n - 1n, Buffer.alloc(64, 0));

      // Add padding data. The vectors that are shorter than their expected size, will be grown to their full circuit
      // size using the last element in the vector as the value. Padding transactions will use nullifier index 0, and
      // expect the value at index 0 to be unchanged.
      const zeroNullPath = await worldStateDb.getHashPath(1, BigInt(0));
      oldNullPaths.push(zeroNullPath);
      newNullPaths.push(zeroNullPath);
    }

    // Get new data.
    const newDataPath = await worldStateDb.getHashPath(0, dataStartIndex);
    const newDataRoot = worldStateDb.getRoot(0);
    const dataRootsRoot = worldStateDb.getRoot(2);

    return new TxRollup(
      Number(dataStartIndex),
      txs.map(tx => tx.proofData),

      oldDataRoot,
      newDataRoot,
      oldDataPath,
      newDataPath,

      oldNullRoot,
      newNullRoots,
      oldNullPaths,
      newNullPaths,

      dataRootsRoot,
      dataRootsPaths,
      dataRootsIndicies,
    );
  }
}

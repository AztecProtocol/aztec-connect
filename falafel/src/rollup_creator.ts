import { ProofData } from 'barretenberg/client_proofs/proof_data';
import { HashPath } from 'barretenberg/merkle_tree';
import { WorldStateDb } from 'barretenberg/world_state_db';
import { toBigIntBE, toBufferBE } from 'bigint-buffer';
import { TxDao } from './entity/tx';
import { ProofGenerator } from './proof_generator';
import { Rollup } from './rollup';
import { RollupDb } from './rollup_db';
import { PublishItem, RollupPublisher } from './rollup_publisher';

export class RollupCreator {
  constructor(
    private rollupDb: RollupDb,
    private worldStateDb: WorldStateDb,
    private proofGenerator: ProofGenerator,
    private rollupPublisher: RollupPublisher,
    private rollupSize: number,
  ) {}

  public async init() {
    await this.proofGenerator.start();
  }

  public destroy() {
    this.proofGenerator.stop();
  }

  /**
   * Creates a rollup from the given txs and publishes it.
   * @returns true if successfully published, otherwise false.
   */
  public async create(txs: TxDao[]) {
    const rollup = await this.createRollup(txs);
    const viewingKeys = txs
      .map(tx => [tx.viewingKey1, tx.viewingKey2])
      .flat()
      .filter(k => !!k);
    const signatures = txs.map(tx => tx.signature!).filter(s => s !== null);
    const sigIndexes = txs.map((tx, i) => (tx.signature ? i : -1)).filter(i => i >= 0);

    await this.rollupDb.addRollup(rollup, viewingKeys);

    console.log(`Creating rollup ${rollup.rollupId} with ${txs.length} txs...`);
    const proof = await this.proofGenerator.createProof(rollup);

    if (!proof) {
      // This shouldn't happen!? What happens to the txs?
      // Perhaps need to extract the troublemaker, and then retry?
      // TODO: Also handle interrupt case.
      console.log('Failed to create proof.');
      await this.rollupDb.deleteRollup(rollup.rollupId);
      return false;
    }

    await this.rollupDb.setRollupProof(rollup.rollupId, proof);

    const publishItem: PublishItem = {
      rollupId: rollup.rollupId,
      proof,
      signatures,
      sigIndexes,
      viewingKeys,
    };

    const success = await this.rollupPublisher.publishRollup(publishItem);
    if (!success) {
      await this.rollupDb.deleteRollup(publishItem.rollupId);
      return false;
    }

    return true;
  }

  /**
   * If a call to `create` is in progress, this will cause it to return early.
   * Currently the call to `proofGenerator.interrupt()` does nothing, so if a proofs being created the caller
   * of `create` will have to wait until it completes.
   * A call to `clearInterrupt` is required before you can continue creating rollups.
   */
  public interrupt() {
    this.proofGenerator.interrupt();
    this.rollupPublisher.interrupt();
  }

  public clearInterrupt() {
    this.proofGenerator.clearInterrupt();
    this.rollupPublisher.clearInterrupt();
  }

  private async createRollup(txs: TxDao[]) {
    const worldStateDb = this.worldStateDb;
    const dataSize = worldStateDb.getSize(0);
    const toInsert = BigInt(this.rollupSize * 2);
    const dataStartIndex = dataSize % toInsert === 0n ? dataSize : dataSize + toInsert - (dataSize % toInsert);

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

    // Deprecated. Use gibberish.
    const accountNullPaths: HashPath[] = new Array(txs.length).fill(await worldStateDb.getHashPath(1, 0n));

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
      worldStateDb.put(0, dataStartIndex + BigInt(this.rollupSize) * 2n - 1n, Buffer.alloc(64, 0));
    }

    // Get new data.
    const newDataPath = await worldStateDb.getHashPath(0, dataStartIndex);
    const newDataRoot = worldStateDb.getRoot(0);

    // Get root tree data.
    const oldDataRootsRoot = worldStateDb.getRoot(2);
    const rootTreeSize = worldStateDb.getSize(2);
    const oldDataRootsPath = await worldStateDb.getHashPath(2, rootTreeSize);
    await worldStateDb.put(2, rootTreeSize, newDataRoot);
    const newDataRootsRoot = worldStateDb.getRoot(2);
    const newDataRootsPath = await worldStateDb.getHashPath(2, rootTreeSize);

    await worldStateDb.rollback();

    return new Rollup(
      await this.rollupDb.getNextRollupId(),
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
      accountNullPaths,

      oldDataRootsRoot,
      newDataRootsRoot,
      oldDataRootsPath,
      newDataRootsPath,
      dataRootsPaths,
      dataRootsIndicies,
    );
  }
}

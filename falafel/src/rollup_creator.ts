import { ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { RollupTreeId, WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { toBigIntBE, toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { ProofGenerator, TxRollup, TxRollupProofRequest } from 'halloumi/proof_generator';
import { RollupProofDao } from './entity/rollup_proof';
import { TxDao } from './entity/tx';
import { Metrics } from './metrics';
import { RollupDb } from './rollup_db';
import { AssetId } from '@aztec/barretenberg/asset';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';

export class RollupCreator {
  constructor(
    private rollupDb: RollupDb,
    private worldStateDb: WorldStateDb,
    private proofGenerator: ProofGenerator,
    private noteAlgo: NoteAlgorithms,
    private numInnerRollupTxs: number,
    private innerRollupSize: number,
    private outerRollupSize: number,
    private metrics: Metrics,
  ) {}

  /**
   * Creates a rollup from the given txs and publishes it.
   * @returns true if successfully published, otherwise false.
   */
  public async create(txs: TxDao[]) {
    if (!txs.length) {
      throw new Error('Txs empty.');
    }
    const rollup = await this.createRollup(txs);

    console.log(`Creating proof for rollup ${rollup.rollupHash.toString('hex')} with ${txs.length} txs...`);
    const end = this.metrics.txRollupTimer();
    const txRollupRequest = new TxRollupProofRequest(this.numInnerRollupTxs, rollup);
    const proof = await this.proofGenerator.createProof(txRollupRequest.toBuffer());
    console.log(`Proof received: ${proof.length}`);
    end();

    if (!proof) {
      // TODO: Once we correctly handle interrupts, this is not a panic scenario.
      throw new Error('Failed to create proof. This should not happen.');
    }

    const rollupProofDao = new RollupProofDao({
      id: rollup.rollupHash,
      txs,
      proofData: proof,
      rollupSize: this.innerRollupSize,
      dataStartIndex: rollup.dataStartIndex,
      created: new Date(),
    });

    await this.rollupDb.addRollupProof(rollupProofDao);

    return rollupProofDao;
  }

  public interrupt() {
    // TODO: Interrupt proof creation.
  }

  private async createRollup(txs: TxDao[]) {
    const rollupId = await this.rollupDb.getNextRollupId();

    // To find the correct data start index, we need to position ourselves on:
    // - an outer rollup size boundary for the first inner proof.
    // - an inner rollup size boundary for any other proofs.
    const firstInner = (await this.rollupDb.getNumRollupProofsBySize(this.innerRollupSize)) === 0;
    const worldStateDb = this.worldStateDb;
    const dataSize = worldStateDb.getSize(RollupTreeId.DATA);
    const subtreeSize = BigInt(firstInner ? this.outerRollupSize * 2 : this.innerRollupSize * 2);
    const dataStartIndex = dataSize % subtreeSize === 0n ? dataSize : dataSize + subtreeSize - (dataSize % subtreeSize);

    // Get old data.
    const oldDataRoot = worldStateDb.getRoot(RollupTreeId.DATA);
    const oldDataPath = await worldStateDb.getHashPath(RollupTreeId.DATA, dataStartIndex);
    const oldNullRoot = worldStateDb.getRoot(RollupTreeId.NULL);

    // Insert each txs elements into the db.
    let nextDataIndex = dataStartIndex;
    const newNullRoots: Buffer[] = [];
    const oldNullPaths: HashPath[] = [];
    const newNullPaths: HashPath[] = [];
    const dataRootsPaths: HashPath[] = [];
    const dataRootsIndicies: number[] = [];
    const bridgeIds: Buffer[] = [];
    const assetIds: Set<AssetId> = new Set();

    for (const tx of txs) {
      const proof = new ProofData(tx.proofData);

      if ([ProofId.DEFI_DEPOSIT, ProofId.DEFI_CLAIM].includes(proof.proofId)) {
        const bridgeId = BridgeId.fromBuffer(proof.assetId);
        assetIds.add(bridgeId.inputAssetId);
      } else if (proof.proofId !== ProofId.ACCOUNT) {
        assetIds.add(proof.assetId.readUInt32BE(28));
      }

      if (proof.proofId !== ProofId.DEFI_DEPOSIT) {
        await worldStateDb.put(RollupTreeId.DATA, nextDataIndex++, proof.noteCommitment1);
      } else {
        if (!bridgeIds.some(id => id.equals(proof.assetId))) {
          bridgeIds.push(proof.assetId);
        }
        const interactionNonce =
          rollupId * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK + bridgeIds.findIndex(id => id.equals(proof.assetId));
        const claimFee = proof.txFee - (proof.txFee >> BigInt(1));
        const encNote = this.noteAlgo.claimNoteCompletePartialCommitment(
          proof.noteCommitment1,
          interactionNonce,
          claimFee,
        );
        await worldStateDb.put(RollupTreeId.DATA, nextDataIndex++, encNote);
      }
      await worldStateDb.put(RollupTreeId.DATA, nextDataIndex++, proof.noteCommitment2);

      const nullifier1 = toBigIntBE(proof.nullifier1);
      const nullifier2 = toBigIntBE(proof.nullifier2);

      oldNullPaths.push(await worldStateDb.getHashPath(RollupTreeId.NULL, nullifier1));
      await worldStateDb.put(RollupTreeId.NULL, nullifier1, toBufferBE(1n, 32));
      newNullRoots.push(worldStateDb.getRoot(RollupTreeId.NULL));
      newNullPaths.push(await worldStateDb.getHashPath(RollupTreeId.NULL, nullifier1));

      oldNullPaths.push(await worldStateDb.getHashPath(RollupTreeId.NULL, nullifier2));
      if (nullifier2) {
        await worldStateDb.put(RollupTreeId.NULL, nullifier2, toBufferBE(1n, 32));
      }
      newNullRoots.push(worldStateDb.getRoot(RollupTreeId.NULL));
      newNullPaths.push(await worldStateDb.getHashPath(RollupTreeId.NULL, nullifier2));

      dataRootsPaths.push(await worldStateDb.getHashPath(RollupTreeId.ROOT, BigInt(tx.dataRootsIndex!)));
      dataRootsIndicies.push(tx.dataRootsIndex!);
    }

    if (txs.length < this.numInnerRollupTxs) {
      // Grows the data tree by inserting 0 at last subtree position.
      await worldStateDb.put(
        RollupTreeId.DATA,
        dataStartIndex + BigInt(this.innerRollupSize) * 2n - 1n,
        Buffer.alloc(64, 0),
      );

      // Add padding data. The vectors that are shorter than their expected size, will be grown to their full circuit
      // size using the last element in the vector as the value. Padding transactions will use nullifier index 0, and
      // expect the value at index 0 to be unchanged.
      const zeroNullPath = await worldStateDb.getHashPath(RollupTreeId.NULL, BigInt(0));
      oldNullPaths.push(zeroNullPath);
      newNullPaths.push(zeroNullPath);
    }

    // Get new data.
    const newDataRoot = worldStateDb.getRoot(RollupTreeId.DATA);
    const dataRootsRoot = worldStateDb.getRoot(RollupTreeId.ROOT);
    const newDefiRoot = worldStateDb.getRoot(RollupTreeId.DEFI);

    return new TxRollup(
      rollupId,
      Number(dataStartIndex),
      txs.map(tx => tx.proofData),

      oldDataRoot,
      newDataRoot,
      oldDataPath,

      oldNullRoot,
      newNullRoots,
      oldNullPaths,

      dataRootsRoot,
      dataRootsPaths,
      dataRootsIndicies,

      newDefiRoot,
      bridgeIds,

      [...assetIds].filter(id => id).map(id => numToUInt32BE(id, 32)),
    );
  }
}

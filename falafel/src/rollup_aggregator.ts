import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { RollupTreeId, WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { ProofGenerator, RootRollup, RootRollupProofRequest } from 'halloumi/proof_generator';
import { AssetId } from '@aztec/barretenberg/asset';
import { RollupDao } from './entity/rollup';
import { RollupProofDao } from './entity/rollup_proof';
import { Metrics } from './metrics';
import { RollupDb } from './rollup_db';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';

export class RollupAggregator {
  constructor(
    private proofGenerator: ProofGenerator,
    private rollupDb: RollupDb,
    private worldStateDb: WorldStateDb,
    private outerRollupSize: number,
    private numInnerRollupTxs: number,
    private numOuterRollupProofs: number,
    private metrics: Metrics,
  ) {}

  public async aggregateRollupProofs(
    innerProofs: RollupProofDao[],
    oldDefiRoot: Buffer,
    oldDefiPath: HashPath,
    defiInteractionNotes: DefiInteractionNote[],
    bridgeIds: BridgeId[],
    assetIds: AssetId[],
  ) {
    console.log(`Creating root rollup proof ${innerProofs.length} inner proofs...`);

    const rootRollup = await this.createRootRollup(
      innerProofs,
      oldDefiRoot,
      oldDefiPath,
      defiInteractionNotes,
      bridgeIds,
      assetIds,
    );
    const end = this.metrics.rootRollupTimer();
    const rootRollupRequest = new RootRollupProofRequest(this.numInnerRollupTxs, this.numOuterRollupProofs, rootRollup);
    const proofData = await this.proofGenerator.createProof(rootRollupRequest.toBuffer());
    end();

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
    rollupProofDao.rollupSize = this.outerRollupSize;
    rollupProofDao.created = new Date();
    rollupProofDao.dataStartIndex = innerProofs[0].dataStartIndex;

    const rollupDao = new RollupDao({
      id: rootRollup.rollupId,
      dataRoot: this.worldStateDb.getRoot(0),
      rollupProof: rollupProofDao,
      created: new Date(),
    });

    await this.rollupDb.addRollup(rollupDao);

    await this.rollupDb.deleteTxlessRollupProofs();

    return rollupDao;
  }

  public interrupt() {
    // TODO: Interrupt proof creation.
  }

  private async createRootRollup(
    rollupProofs: RollupProofDao[],
    oldDefiRoot: Buffer,
    oldDefiPath: HashPath,
    defiInteractionNotes: DefiInteractionNote[],
    bridgeIds: BridgeId[],
    assetIds: AssetId[],
  ) {
    const worldStateDb = this.worldStateDb;

    const rollupId = await this.rollupDb.getNextRollupId();

    // Root tree update.
    const newDataRoot = worldStateDb.getRoot(RollupTreeId.DATA);
    const oldDataRootsRoot = worldStateDb.getRoot(RollupTreeId.ROOT);
    const rootTreeSize = worldStateDb.getSize(RollupTreeId.ROOT);
    const oldDataRootsPath = await worldStateDb.getHashPath(RollupTreeId.ROOT, rootTreeSize);
    await worldStateDb.put(RollupTreeId.ROOT, rootTreeSize, newDataRoot);
    const newDataRootsRoot = worldStateDb.getRoot(RollupTreeId.ROOT);

    // Defi tree update.
    const newDefiRoot = worldStateDb.getRoot(RollupTreeId.DEFI);

    if (rollupProofs.length < this.numOuterRollupProofs) {
      const endIndex = rollupProofs[0].dataStartIndex + this.outerRollupSize * 2 - 1;
      // Grows the data tree by inserting 0 at last subtree position.
      await worldStateDb.put(RollupTreeId.DATA, BigInt(endIndex), Buffer.alloc(32, 0));
    }

    const rootRollup = new RootRollup(
      rollupId,
      rollupProofs.map(tx => tx.proofData),
      oldDataRootsRoot,
      newDataRootsRoot,
      oldDataRootsPath,
      oldDefiRoot,
      newDefiRoot,
      oldDefiPath,
      bridgeIds.map(id => id.toBigInt()),
      assetIds.map(id => numToUInt32BE(id, 32)),
      defiInteractionNotes.map(n => n.toBuffer()),
    );

    return rootRollup;
  }
}

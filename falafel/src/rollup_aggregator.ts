import { EthAddress } from '@aztec/barretenberg/address';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { RollupTreeId, WorldStateDb } from '@aztec/barretenberg/world_state_db';
import {
  ProofGenerator,
  RootRollup,
  RootRollupProofRequest,
  RootVerifier,
  RootVerifierProofRequest,
} from 'halloumi/proof_generator';
import { RollupDao, RollupProofDao } from './entity';
import { Metrics } from './metrics';
import { RollupDb } from './rollup_db';

export class RollupAggregator {
  constructor(
    private proofGenerator: ProofGenerator,
    private rollupDb: RollupDb,
    private worldStateDb: WorldStateDb,
    private outerRollupSize: number,
    private numOuterRollupProofs: number,
    private rollupBeneficiary: EthAddress,
    private metrics: Metrics,
  ) {}

  public async aggregateRollupProofs(
    innerProofs: RollupProofDao[],
    oldDefiRoot: Buffer,
    oldDefiPath: HashPath,
    defiInteractionNotes: DefiInteractionNote[],
    bridgeIds: bigint[],
    assetIds: number[],
  ) {
    console.log(`Creating root rollup proof with ${innerProofs.length} inner proofs...`);

    const rootRollup = await this.createRootRollup(
      innerProofs,
      oldDefiRoot,
      oldDefiPath,
      defiInteractionNotes,
      bridgeIds,
      assetIds,
    );
    const end = this.metrics.rootRollupTimer();
    const rootRollupRequest = new RootRollupProofRequest(rootRollup);
    const rootRollupProofBuf = await this.proofGenerator.createProof(rootRollupRequest.toBuffer());

    if (!rootRollupProofBuf) {
      throw new Error('Failed to create root rollup proof. This should not happen.');
    }

    console.log(`Creating root verifier proof...`);

    const rootVerifier = await this.createRootVerifier(rootRollupProofBuf);
    const rootVerifierRequest = new RootVerifierProofRequest(rootVerifier);
    const finalProofData = await this.proofGenerator.createProof(rootVerifierRequest.toBuffer());

    if (!finalProofData) {
      throw new Error('Failed to create valid aggregate rollup.');
    }
    end();

    const rollupProofData = RollupProofData.fromBuffer(finalProofData);
    const rollupProofDao = new RollupProofDao();
    rollupProofDao.id = rollupProofData.rollupHash;
    // TypeOrm is bugged using Buffers as primaries, so there's an internalId that's a string.
    // I've mostly hidden this workaround in the entities but it's needed here.
    rollupProofDao.internalId = rollupProofData.rollupHash.toString('hex');
    rollupProofDao.txs = innerProofs.map(p => p.txs).flat();
    rollupProofDao.proofData = finalProofData;
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
    bridgeIds: bigint[],
    assetIds: number[],
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
      bridgeIds,
      assetIds.map(id => numToUInt32BE(id, 32)),
      defiInteractionNotes.map(n => n.toBuffer()),
      this.rollupBeneficiary,
    );

    return rootRollup;
  }

  private async createRootVerifier(rootRollupProofBuf: Buffer) {
    const rootVerifier = new RootVerifier(rootRollupProofBuf);
    return rootVerifier;
  }
}

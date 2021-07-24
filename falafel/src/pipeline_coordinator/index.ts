import { DefiInteractionNote, NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { RollupTreeId, WorldStateDb } from '@aztec/barretenberg/world_state_db';
import moment, { Duration } from 'moment';
import { ClaimProofCreator } from '../claim_proof_creator';
import { RollupAggregator } from '../rollup_aggregator';
import { RollupCreator } from '../rollup_creator';
import { RollupDb } from '../rollup_db';
import { parseInteractionResult } from '../rollup_db/parse_interaction_result';
import { RollupPublisher } from '../rollup_publisher';
import { TxFeeResolver } from '../tx_fee_resolver';
import { PublishTimeManager } from './publish_time_manager';
import { RollupCoordinator } from './rollup_coordinator';

export class PipelineCoordinator {
  private running = false;
  private runningPromise!: Promise<void>;
  private publishTimeManager!: PublishTimeManager;
  private rollupCoordinator!: RollupCoordinator;

  constructor(
    private rollupCreator: RollupCreator,
    private rollupAggregator: RollupAggregator,
    private rollupPublisher: RollupPublisher,
    private claimProofCreator: ClaimProofCreator,
    private feeResolver: TxFeeResolver,
    private worldStateDb: WorldStateDb,
    private rollupDb: RollupDb,
    private noteAlgo: NoteAlgorithms,
    private numInnerRollupTxs: number,
    private numOuterRollupProofs: number,
    private publishInterval: Duration,
  ) {}

  public getNextPublishTime() {
    if (!this.running || !this.publishTimeManager) {
      return moment().add(this.publishInterval).toDate();
    }

    return this.publishTimeManager.getPublishTime();
  }

  /**
   * Starts monitoring for txs, and once conditions are met, creates a rollup.
   * Stops monitoring once a rollup has been successfully published or `stop` called.
   */
  public start() {
    if (this.running) {
      throw new Error('Pipeline coordinator has started running.');
    }

    this.running = true;

    const fn = async () => {
      await this.reset();

      await this.claimProofCreator.create(this.numInnerRollupTxs * this.numOuterRollupProofs);

      while (this.running) {
        const pendingTxs = await this.rollupDb.getPendingTxs();
        const published = await this.rollupCoordinator.processPendingTxs(pendingTxs);
        if (published) {
          this.running = false;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * +this.running));
      }
    };

    return (this.runningPromise = fn());
  }

  /**
   * Interrupts any current rollup generation, stops monitoring for txs, and blocks until fully stopped.
   */
  public async stop() {
    if (!this.running) {
      return;
    }

    this.running = false;
    this.claimProofCreator.interrupt();
    this.rollupCoordinator?.interrupt();
    await this.runningPromise;
  }

  public flushTxs() {
    this.rollupCoordinator.flushTxs();
  }

  private async reset() {
    // Erase any outstanding rollups and proofs to release unsettled txs.
    await this.rollupDb.deleteUnsettledRollups();
    await this.rollupDb.deleteOrphanedRollupProofs();
    await this.rollupDb.deleteUnsettledClaimTxs();
    const lastRollup = await this.rollupDb.getLastSettledRollup();
    const rollupId = lastRollup ? lastRollup.id + 1 : 0;

    this.publishTimeManager = new PublishTimeManager(
      this.numInnerRollupTxs * this.numOuterRollupProofs,
      this.publishInterval,
      this.feeResolver,
    );

    const oldDefiRoot = this.worldStateDb.getRoot(RollupTreeId.DEFI);
    const oldDefiPath = await this.worldStateDb.getHashPath(
      RollupTreeId.DEFI,
      BigInt(Math.max(0, rollupId - 1) * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK),
    );
    const defiInteractionNotes = lastRollup ? parseInteractionResult(lastRollup.interactionResult) : [];
    await this.updateDefiTree(defiInteractionNotes);
    this.rollupCoordinator = new RollupCoordinator(
      this.publishTimeManager,
      this.rollupCreator,
      this.rollupAggregator,
      this.rollupPublisher,
      this.numInnerRollupTxs,
      this.numOuterRollupProofs,
      oldDefiRoot,
      oldDefiPath,
      defiInteractionNotes,
    );
  }

  private async updateDefiTree(notes: DefiInteractionNote[]) {
    for (const note of notes) {
      await this.worldStateDb.put(
        RollupTreeId.DEFI,
        BigInt(note.nonce),
        this.noteAlgo.defiInteractionNoteCommitment(note),
      );
    }
  }
}

import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { RollupTreeId, WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { ClaimProofCreator } from '../claim_proof_creator';
import { RollupAggregator } from '../rollup_aggregator';
import { RollupCreator } from '../rollup_creator';
import { RollupDb, parseInteractionResult } from '../rollup_db';
import { RollupPublisher } from '../rollup_publisher';
import { TxFeeResolver } from '../tx_fee_resolver';
import { BridgeResolver } from '../bridge';
import { PublishTimeManager } from './publish_time_manager';
import { RollupCoordinator } from './rollup_coordinator';
import { TxDao } from '../entity';
import { createDebugLogger, createLogger } from '@aztec/barretenberg/log';
import { InterruptError } from '@aztec/barretenberg/errors';
import { RollupProfile, emptyProfile } from './rollup_profiler';
import { Metrics } from '../metrics';

export class PipelineCoordinator {
  private flush = false;
  private running = false;
  private runningPromise!: Promise<void>;
  private publishTimeManager!: PublishTimeManager;
  private rollupCoordinator?: RollupCoordinator;
  private debug = createDebugLogger('pipeline_coordinator');
  private log = createLogger('PipelineCoordinator');
  private nextRollupProfile: RollupProfile;

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
    private publishInterval: number,
    private flushAfterIdle: number,
    private bridgeResolver: BridgeResolver,
    private maxCallDataPerRollup: number,
    private maxGasPerRollup: number,
    private metrics: Metrics,
  ) {
    this.publishTimeManager = new PublishTimeManager(this.publishInterval, this.bridgeResolver);
    this.nextRollupProfile = emptyProfile(this.numInnerRollupTxs * this.numOuterRollupProofs);
  }

  public getNextPublishTime() {
    return this.publishTimeManager.calculateNextTimeouts();
  }

  public getProcessedTxs() {
    return this.rollupCoordinator?.getProcessedTxs();
  }

  /**
   * Starts monitoring for txs, and once conditions are met, creates a rollup.
   * Stops monitoring once a rollup has been successfully published or `stop` or 'flushTxs' called.
   */
  public start() {
    if (this.running) {
      throw new Error('Pipeline coordinator is already running.');
    }

    this.running = true;

    const fn = async () => {
      await this.init();

      this.log(`Starting with ${await this.rollupDb.getPendingTxCount()} pending txs.`);

      await this.claimProofCreator.create(this.numInnerRollupTxs * this.numOuterRollupProofs);

      while (this.running) {
        this.debug('Getting pending txs...');
        const pendingTxs = await this.rollupDb.getPendingTxs();

        this.flush = this.flush || this.minTxWaitTimeExceeded(pendingTxs);

        this.debug('Processing pending txs...');
        this.nextRollupProfile = await this.rollupCoordinator!.processPendingTxs(pendingTxs, this.flush);

        if (this.nextRollupProfile.published) {
          this.running = false;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * +this.running));
      }

      this.log('Pipeline exited.');
    };

    return (this.runningPromise = fn().catch(err => {
      if (err instanceof InterruptError) {
        this.log('Pipeline interrupted.');
      } else {
        throw err;
      }
    }));
  }

  /**
   * Interrupts any current rollup generation, stops monitoring for txs, and blocks until fully stopped.
   */
  public async stop() {
    if (!this.running) {
      await this.runningPromise;
      return;
    }

    this.running = false;
    this.claimProofCreator.interrupt();
    await this.rollupCoordinator?.interrupt();
    await this.runningPromise;
  }

  /**
   * Triggers the pipeline to flush any pending txs and exit. A graceful stop().
   */
  public flushTxs() {
    this.flush = true;
  }

  /**
   * Initialize the pipeline.
   * Resets db state such that any lingering state from a prior pipeline that didn't complete for any reason, is erased.
   * Inserts the defi interaction notes emitted from the contract into the defi tree.
   * Constructs the RollupCoordinator.
   */
  private async init() {
    // Erase any outstanding rollups and proofs to release unsettled txs.
    await this.rollupDb.deleteUnsettledRollups();
    await this.rollupDb.deleteOrphanedRollupProofs();
    await this.rollupDb.deleteUnsettledClaimTxs();
    const lastRollup = await this.rollupDb.getLastSettledRollup();
    const rollupId = lastRollup ? lastRollup.id + 1 : 0;

    const oldDefiRoot = this.worldStateDb.getRoot(RollupTreeId.DEFI);
    const oldDefiPath = await this.worldStateDb.getHashPath(
      RollupTreeId.DEFI,
      BigInt(rollupId * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK),
    );

    const defiInteractionNotes = lastRollup
      ? parseInteractionResult(lastRollup.interactionResult!).map(d => d.toDefiInteractionNote())
      : [];
    const interactionNoteStartIndex = BigInt(rollupId * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK);
    for (let i = 0; i < defiInteractionNotes.length; ++i) {
      await this.worldStateDb.put(
        RollupTreeId.DEFI,
        interactionNoteStartIndex + BigInt(i),
        this.noteAlgo.defiInteractionNoteCommitment(defiInteractionNotes[i]),
      );
    }

    this.rollupCoordinator = new RollupCoordinator(
      this.publishTimeManager,
      this.rollupCreator,
      this.rollupAggregator,
      this.rollupPublisher,
      this.numInnerRollupTxs,
      this.numOuterRollupProofs,
      oldDefiRoot,
      oldDefiPath,
      this.bridgeResolver,
      this.feeResolver,
      defiInteractionNotes,
      this.maxGasPerRollup,
      this.maxCallDataPerRollup,
      this.metrics,
    );
  }

  /**
   * Returns true if there are pending txs, and the latest is older than flushAfterIdle.
   */
  private minTxWaitTimeExceeded(txs: TxDao[]) {
    if (!this.flushAfterIdle || !txs.length) {
      return false;
    }
    return new Date().getTime() - txs[txs.length - 1].created.getTime() > this.flushAfterIdle * 1000;
  }
}

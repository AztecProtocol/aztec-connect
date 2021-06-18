import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { DefiDepositProofData, ProofData } from '@aztec/barretenberg/client_proofs';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { RollupTreeId, WorldStateDb } from '@aztec/barretenberg/world_state_db';
import moment, { Duration } from 'moment';
import { ClaimProofCreator } from './claim_proof_creator';
import { RollupDao } from './entity/rollup';
import { RollupProofDao } from './entity/rollup_proof';
import { TxDao } from './entity/tx';
import { RollupAggregator } from './rollup_aggregator';
import { RollupCreator } from './rollup_creator';
import { RollupDb } from './rollup_db';
import { parseInteractionResult } from './rollup_db/parse_interaction_result';
import { RollupPublisher } from './rollup_publisher';
import { TxFeeResolver } from './tx_fee_resolver';

export class PipelineCoordinator {
  private running = false;
  private runningPromise!: Promise<void>;
  private flush = false;
  private innerProofs: RollupProofDao[] = [];
  private txs: TxDao[] = [];
  private lastRollup?: RollupDao;
  private rollupId!: number;
  private oldDefiRoot!: Buffer;
  private oldDefiPath!: HashPath;
  private defiInteractionNotes: DefiInteractionNote[] = [];
  private bridgeIds: BridgeId[] = [];
  private txsPublishTime?: moment.Moment;

  constructor(
    private rollupCreator: RollupCreator,
    private rollupAggregator: RollupAggregator,
    private rollupPublisher: RollupPublisher,
    private claimProofCreator: ClaimProofCreator,
    private worldStateDb: WorldStateDb,
    private rollupDb: RollupDb,
    private numInnerRollupTxs: number,
    private numOuterRollupProofs: number,
    private publishInterval: Duration,
    private feeResolver: TxFeeResolver,
  ) {}

  public getNextPublishTime() {
    if (!this.running || !this.txsPublishTime) {
      // No txs, report publish time is in publishInterval seconds (not necessarily true).
      return moment().add(this.publishInterval).toDate();
    }

    return (this.txsPublishTime.isSameOrAfter() ? this.txsPublishTime : moment()).toDate();
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
    this.flush = false;

    const fn = async () => {
      await this.reset();
      await this.updateDefiTree();

      await this.claimProofCreator.create(this.numInnerRollupTxs * this.numOuterRollupProofs);

      while (this.running) {
        await this.aggregateAndPublish();
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
    this.rollupCreator.interrupt();
    this.rollupAggregator.interrupt();
    this.rollupPublisher.interrupt();
    await this.runningPromise;
  }

  public flushTxs() {
    this.flush = true;
  }

  private async reset() {
    // Erase any outstanding rollups and proofs to release unsettled txs.
    await this.rollupDb.deleteUnsettledRollups();
    await this.rollupDb.deleteOrphanedRollupProofs();
    await this.rollupDb.deleteUnsettledClaimTxs();
    this.lastRollup = await this.rollupDb.getLastSettledRollup();
    this.rollupId = await this.rollupDb.getNextRollupId();
    this.oldDefiRoot = this.worldStateDb.getRoot(RollupTreeId.DEFI);
    this.oldDefiPath = await this.worldStateDb.getHashPath(
      RollupTreeId.DEFI,
      BigInt(this.rollupId * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK),
    );
  }

  private async updateDefiTree() {
    const prevRollup = await this.rollupDb.getRollup(this.rollupId - 1);
    if (!prevRollup) {
      return;
    }

    const notes = parseInteractionResult(prevRollup.interactionResult);
    for (const note of notes) {
      await this.worldStateDb.put(
        RollupTreeId.DEFI,
        BigInt(note.nonce),
        Buffer.alloc(64, 0), // TODO
      );
      this.defiInteractionNotes.push(note);
    }
    if (notes.length < RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK) {
      const endIndex = this.rollupId * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK - 1;
      await this.worldStateDb.put(RollupTreeId.DEFI, BigInt(endIndex), Buffer.alloc(64, 0));
    }
  }

  private refreshTxsPublishTime(txs: TxDao[]) {
    if (!txs.length) {
      return;
    }

    // Rollup now if
    // - we have a tx, but have not rolled up before.
    // - txs is full.
    if (!this.lastRollup || txs.length >= this.numInnerRollupTxs * this.numOuterRollupProofs) {
      this.txsPublishTime = moment();
      return;
    }

    // We have rolled up before. Rollup in publishInterval seconds from latest rollup.
    // Or at the time no later than all txs's expected publish time.
    const nextRollupTime = moment(this.lastRollup.mined).add(this.publishInterval);
    this.txsPublishTime = txs
      .map(tx => {
        const ratio = this.feeResolver.computeSurplusRatio([tx], this.rollupId);
        return moment(tx.created).add(this.publishInterval.asSeconds() * ratio, 's');
      })
      .reduce((time, txTime) => (time.isBefore(txTime) ? time : txTime), nextRollupTime);
  }

  private async aggregateAndPublish() {
    const pendingTxs = await this.getPendingTxs();
    this.refreshTxsPublishTime([...this.txs, ...pendingTxs]);

    const nextRollupTime = this.getNextPublishTime();
    if (moment(nextRollupTime).isSameOrBefore()) {
      this.flush = true;
    }

    while (
      ((this.flush && pendingTxs.length) || pendingTxs.length >= this.numInnerRollupTxs) &&
      this.innerProofs.length < this.numOuterRollupProofs &&
      this.running
    ) {
      const txs = pendingTxs.splice(0, this.numInnerRollupTxs);
      const rollupProofDao = await this.rollupCreator.create(txs);
      this.txs = [...this.txs, ...txs];
      this.innerProofs.push(rollupProofDao);
    }

    if (
      !this.flush ||
      !this.running ||
      // Check this.innerProofs in case:
      // - this.flush is set to true by calling flushTxs()
      // - publishInterval is zero and nextRollupTime is always now
      !this.innerProofs.length
    ) {
      return;
    }

    const rollupDao = await this.rollupAggregator.aggregateRollupProofs(
      this.innerProofs,
      this.oldDefiRoot,
      this.oldDefiPath,
      this.defiInteractionNotes,
      this.bridgeIds.concat(
        Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK - this.bridgeIds.length).fill(BridgeId.ZERO),
      ),
    );
    if (this.running) {
      await this.rollupPublisher.publishRollup(rollupDao);
      this.running = false;
    }
  }

  private async getPendingTxs() {
    const remainingTxSlots = this.numInnerRollupTxs * (this.numOuterRollupProofs - this.innerProofs.length);
    const pendingTxs = (await this.rollupDb.getPendingTxs()).sort((a, b) =>
      a.txType === TxType.DEFI_CLAIM && a.txType !== b.txType ? -1 : 1,
    );
    const txs: TxDao[] = [];
    for (let i = 0; i < pendingTxs.length && txs.length < remainingTxSlots; ++i) {
      const tx = pendingTxs[i];
      if (tx.txType !== TxType.DEFI_DEPOSIT) {
        txs.push(tx);
      } else {
        const { bridgeId } = new DefiDepositProofData(new ProofData(tx.proofData));
        if (this.bridgeIds.some(id => id.equals(bridgeId))) {
          txs.push(tx);
        } else if (this.bridgeIds.length < RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK) {
          this.bridgeIds.push(bridgeId);
          txs.push(tx);
        }
      }
    }
    return txs;
  }
}

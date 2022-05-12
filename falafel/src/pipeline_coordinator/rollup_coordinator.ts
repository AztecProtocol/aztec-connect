import { isAccountCreation, isDefiDeposit, TxType } from '@aztec/barretenberg/blockchain';
import { DefiDepositProofData, ProofData } from '@aztec/barretenberg/client_proofs';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { BridgeResolver } from '../bridge';
import { RollupProofDao } from '../entity/rollup_proof';
import { TxDao } from '../entity/tx';
import { RollupAggregator } from '../rollup_aggregator';
import { RollupCreator } from '../rollup_creator';
import { RollupPublisher } from '../rollup_publisher';
import { TxFeeResolver } from '../tx_fee_resolver';
import { BridgeTxQueue, createDefiRollupTx, createRollupTx, RollupTx } from './bridge_tx_queue';
import { PublishTimeManager, RollupTimeouts } from './publish_time_manager';
import { emptyProfile, profileRollup, RollupProfile } from './rollup_profiler';
import { TxRollup } from 'halloumi/proof_generator';

export class RollupCoordinator {
  private innerProofs: RollupProofDao[] = [];
  private txs: RollupTx[] = [];
  private rollupBridgeIds: bigint[] = [];
  private rollupAssetIds: Set<number> = new Set();
  private published = false;
  private bridgeQueues = new Map<bigint, BridgeTxQueue>();

  constructor(
    private publishTimeManager: PublishTimeManager,
    private rollupCreator: RollupCreator,
    private rollupAggregator: RollupAggregator,
    private rollupPublisher: RollupPublisher,
    private numInnerRollupTxs: number,
    private numOuterRollupProofs: number,
    private oldDefiRoot: Buffer,
    private oldDefiPath: HashPath,
    private bridgeResolver: BridgeResolver,
    private feeResolver: TxFeeResolver,
    private defiInteractionNotes: DefiInteractionNote[] = [],
  ) {}

  private initialiseBridgeQueues(rollupTimeouts: RollupTimeouts) {
    this.bridgeQueues = new Map<bigint, BridgeTxQueue>();
    for (const { bridgeId } of this.bridgeResolver.getBridgeConfigs()) {
      const bt = rollupTimeouts.bridgeTimeouts.get(bridgeId);
      this.bridgeQueues.set(bridgeId, new BridgeTxQueue(bridgeId, this.feeResolver, bt));
    }
  }

  getProcessedTxs() {
    return this.txs.map(rollupTx => rollupTx.tx);
  }

  interrupt() {
    this.txs = [];
    this.rollupCreator.interrupt();
    this.rollupAggregator.interrupt();
    this.rollupPublisher.interrupt();
  }

  async processPendingTxs(pendingTxs: TxDao[], flush = false): Promise<RollupProfile> {
    let profile = emptyProfile(this.numInnerRollupTxs * this.numOuterRollupProofs);
    if (this.published) {
      return profile;
    }

    const rollupTimeouts = this.publishTimeManager.calculateLastTimeouts();
    this.initialiseBridgeQueues(rollupTimeouts);
    const bridgeIds = [...this.rollupBridgeIds];
    const assetIds = new Set<number>(this.rollupAssetIds);

    const txs = this.getNextTxsToRollup(pendingTxs, flush, assetIds, bridgeIds);

    profile = await this.aggregateAndPublish(txs, rollupTimeouts, flush);
    this.published = profile.published;
    return profile;
  }

  private handleNewDefiTx(
    tx: TxDao,
    remainingTxSlots: number,
    txsForRollup: RollupTx[],
    flush: boolean,
    assetIds: Set<number>,
    bridgeIds: bigint[],
  ): RollupTx[] {
    // we have a new defi interaction, we need to determine if it can be accepted and if so whether it gets queued or goes straight on chain.
    const proof = new ProofData(tx.proofData);
    const defiProof = new DefiDepositProofData(proof);
    const rollupTx = createDefiRollupTx(tx, defiProof);

    const addTxs = (txs: RollupTx[]) => {
      for (const tx of txs) {
        txsForRollup.push(tx);
        if (tx.fee.value && this.feeResolver.isFeePayingAsset(tx.fee.assetId)) {
          assetIds.add(tx.fee.assetId);
        }
        if (!tx.bridgeId) {
          // this shouldn't be possible
          console.log(`Adding a tx that should be DEFI but it has no bridge id!`);
          continue;
        }
        if (!bridgeIds.some(id => id === tx.bridgeId)) {
          bridgeIds.push(tx.bridgeId);
        }
      }
    };

    if (bridgeIds.some(id => id === rollupTx.bridgeId)) {
      // we already have txs for this bridge in the rollup, add it straight in
      addTxs([rollupTx]);
      return txsForRollup;
    }

    if (bridgeIds.length === RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK) {
      // this rollup doesn't have any txs for this bridge and can't take any more
      return txsForRollup;
    }

    if (flush) {
      // we have been told to flush, add it straight into the rollup
      addTxs([rollupTx]);
      return txsForRollup;
    }
    const bridgeId = defiProof.bridgeId.toBigInt();

    let bridgeQueue = this.bridgeQueues.get(bridgeId);

    if (!bridgeQueue) {
      // We don't have a bridge config for this!!
      this.bridgeQueues.set(bridgeId, new BridgeTxQueue(bridgeId, this.feeResolver));
      bridgeQueue = this.bridgeQueues.get(bridgeId)!;
    }

    //if we are beyond the timeout interval for this bridge then add it straight in
    if (bridgeQueue.transactionHasTimedOut(rollupTx)) {
      addTxs([rollupTx]);
      return txsForRollup;
    }

    // Add this tx to the queue for this bridge and work out if we can put any more txs into the current batch or create a new one
    bridgeQueue.addDefiTx(rollupTx);
    const newTxs = bridgeQueue.getTxsToRollup(remainingTxSlots, assetIds, RollupProofData.NUMBER_OF_ASSETS);
    addTxs(newTxs);
    return txsForRollup;
  }

  private getNextTxsToRollup(pendingTxs: TxDao[], flush: boolean, assetIds: Set<number>, bridgeIds: bigint[]) {
    const remainingTxSlots = this.numInnerRollupTxs * (this.numOuterRollupProofs - this.innerProofs.length);
    let txs: RollupTx[] = [];

    const sortedTxs = [...pendingTxs].sort((a, b) =>
      a.txType === TxType.DEFI_CLAIM && a.txType !== b.txType ? -1 : 1,
    );

    const discardedCommitments: Buffer[] = [];
    for (let i = 0; i < sortedTxs.length && txs.length < remainingTxSlots; ++i) {
      const tx = sortedTxs[i];
      const proofData = new ProofData(tx.proofData);
      const assetId = proofData.txFeeAssetId.readUInt32BE(28);

      if (isAccountCreation(tx.txType)) {
        txs.push(createRollupTx(tx, proofData));
        continue;
      }

      const discardTx = () => {
        discardedCommitments.push(proofData.noteCommitment1);
        discardedCommitments.push(proofData.noteCommitment2);
      };

      const addTx = () => {
        if (this.feeResolver.isFeePayingAsset(assetId)) {
          assetIds.add(assetId);
        }
        txs.push(createRollupTx(tx, proofData));
      };

      if (
        this.feeResolver.isFeePayingAsset(assetId) &&
        !assetIds.has(assetId) &&
        assetIds.size === RollupProofData.NUMBER_OF_ASSETS
      ) {
        discardTx();
        continue;
      }

      if (
        !proofData.backwardLink.equals(Buffer.alloc(32)) &&
        discardedCommitments.some(c => c.equals(proofData.backwardLink))
      ) {
        discardTx();
        continue;
      }

      if (!isDefiDeposit(tx.txType)) {
        addTx();
      } else {
        txs = this.handleNewDefiTx(tx, remainingTxSlots - txs.length, txs, flush, assetIds, bridgeIds);
      }
    }
    return txs;
  }

  private printRollupState(rollupProfile: RollupProfile, timeout: boolean, flush: boolean) {
    console.log(
      `New rollup - size: ${rollupProfile.rollupSize}, numTxs: ${rollupProfile.totalTxs}, timeout/flush: ${timeout}/${flush}, gas balance: ${rollupProfile.gasBalance}, inner/outer chains: ${rollupProfile.innerChains}/${rollupProfile.outerChains}`,
    );
    for (const bp of rollupProfile.bridgeProfiles.values()) {
      console.log(
        `Defi bridge published. Id: ${bp.bridgeId.toString()}, numTxs: ${bp.numTxs}, gas balance: ${
          bp.gasAccrued - bp.gasThreshold
        }`,
      );
    }
  }

  private async buildInnerRollup(innerTxs: RollupTx[], rollup: TxRollup) {
    // In this case innerTsx is expected to be <= this.numInnerRollupTxs
    if (innerTxs.length > this.numInnerRollupTxs) {
      throw new Error(`innerTxs.length > this.numInnerRollupTxs: ${innerTxs.length} > ${this.numInnerRollupTxs}`);
    }
    const rollupProofDao = await this.rollupCreator.create(
      innerTxs.map(rollupTx => rollupTx.tx),
      rollup,
    );

    return rollupProofDao;
  }

  private async aggregateAndPublish(pendingTxs: RollupTx[], rollupTimeouts: RollupTimeouts, flush: boolean) {
    const numRemainingSlots = (this.numOuterRollupProofs - this.innerProofs.length) * this.numInnerRollupTxs;
    if (pendingTxs.length > numRemainingSlots) {
      // this shouldn't happen!
      throw new Error(`pendingTxs.length > numRemainingSlots: ${pendingTxs.length} > ${numRemainingSlots}`);
    }

    // We wait until the shouldPublish condition is met and then farm out all inner rollups to a number of
    // distributed halloumi instances.
    const rollupProfile = profileRollup(
      pendingTxs,
      this.feeResolver,
      this.numInnerRollupTxs,
      this.numInnerRollupTxs * this.numOuterRollupProofs,
    );

    if (!rollupProfile.totalTxs) {
      // no txs at all
      return rollupProfile;
    }

    const profit = rollupProfile.gasBalance >= 0n;
    const timedout = rollupTimeouts.baseTimeout
      ? rollupProfile.earliestTx.getTime() <= rollupTimeouts.baseTimeout.timeout.getTime()
      : false;
    const shouldPublish = flush || profit || timedout;

    if (shouldPublish) {
      this.txs = [...pendingTxs];
      const rollupProofPromises: Promise<RollupProofDao>[] = [];

      // We have to pass the firstInner flag in as nothing is in the DB yet so the previous
      // query to check DB size wont work.  Since we are doing all proofs in one hit now
      // this is fine...  similarly though this.txs and the various append(s) to that are
      // not required, all this will clean up asap.
      let firstInner = true;
      while (pendingTxs.length) {
        const txs = pendingTxs.splice(0, this.numInnerRollupTxs);

        // Moved tree updates outside of parallel loops as these were previously done
        // inside buildInnerRollup() which was ok when that was sequential.  These updates
        // need to be done before any calls to create() on the rollup creator or it will
        // fail to find the linked commitments from the transaction.
        const rollup = await this.rollupCreator.createRollup(
          txs.map(rollupTx => rollupTx.tx),
          this.rollupBridgeIds,
          this.rollupAssetIds,
          firstInner,
        );

        firstInner = false;
        rollupProofPromises.push(this.buildInnerRollup(txs, rollup));
      }

      // This will call the proof generator (Halloumi) in parallel and populate the
      // this.innerProofs which is used below in the aggregator.
      const rollupProofDaos = await Promise.all(rollupProofPromises);

      // Its important that the inner proofs are inserted into the DB in the same
      // order that we called createRollup() above as the first proof and following
      // proofs have different start indexes.
      await this.rollupCreator.addRollupProofs(rollupProofDaos);
      this.innerProofs.push(...rollupProofDaos);
    }

    // here we either have
    // 1. no rollup at all
    // 2. a partial rollup that we need to publish
    // 3. a full rollup
    if (!this.innerProofs.length) {
      // nothing to publish
      return rollupProfile;
    }

    const rollupDao = await this.rollupAggregator.aggregateRollupProofs(
      this.innerProofs,
      this.oldDefiRoot,
      this.oldDefiPath,
      this.defiInteractionNotes,
      this.rollupBridgeIds.concat(
        Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK - this.rollupBridgeIds.length).fill(0n),
      ),
      [...this.rollupAssetIds],
    );
    rollupProfile.published = await this.rollupPublisher.publishRollup(rollupDao);
    this.printRollupState(rollupProfile, timedout, flush);

    return rollupProfile;
  }
}

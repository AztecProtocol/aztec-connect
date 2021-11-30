import { AssetId } from '@aztec/barretenberg/asset';
import { TxType, isDefiDeposit, isAccountCreation } from '@aztec/barretenberg/blockchain';
import { BridgeId, BridgeConfig } from '@aztec/barretenberg/bridge_id';
import { DefiDepositProofData, ProofData } from '@aztec/barretenberg/client_proofs';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { RollupProofDao } from '../entity/rollup_proof';
import { TxDao } from '../entity/tx';
import { RollupAggregator } from '../rollup_aggregator';
import { RollupCreator } from '../rollup_creator';
import { RollupPublisher } from '../rollup_publisher';
import { PublishTimeManager, RollupTimeouts } from './publish_time_manager';
import { TxFeeResolver } from '../tx_fee_resolver';
import { RollupTx, BridgeTxQueue, createRollupTx, createDefiRollupTx } from './bridge_tx_queue';
import { emptyProfile, profileRollup, RollupProfile } from './rollup_profiler';
import { BridgeCostResolver } from '../tx_fee_resolver/bridge_cost_resolver';

export class RollupCoordinator {
  private innerProofs: RollupProofDao[] = [];
  private txs: RollupTx[] = [];
  private rollupBridgeIds: BridgeId[] = [];
  private rollupAssetIds: Set<AssetId> = new Set();
  private published = false;
  private bridgeQueues = new Map<string, BridgeTxQueue>();

  constructor(
    private publishTimeManager: PublishTimeManager,
    private rollupCreator: RollupCreator,
    private rollupAggregator: RollupAggregator,
    private rollupPublisher: RollupPublisher,
    private numInnerRollupTxs: number,
    private numOuterRollupProofs: number,
    private oldDefiRoot: Buffer,
    private oldDefiPath: HashPath,
    private bridgeConfigs: BridgeConfig[],
    private feeResolver: TxFeeResolver,
    private bridgeCostResolver: BridgeCostResolver,
    private defiInteractionNotes: DefiInteractionNote[] = [],
  ) {}

  private initialiseBridgeQueues(rollupTimeouts: RollupTimeouts) {
    this.bridgeQueues = new Map<string, BridgeTxQueue>();
    for (const bc of this.bridgeConfigs) {
      const bt = rollupTimeouts.bridgeTimeouts.get(bc.bridgeId.toString());
      this.bridgeQueues.set(bc.bridgeId.toString(), new BridgeTxQueue(bc, bt, this.bridgeCostResolver));
    }
  }

  get processedTxs() {
    return this.txs.map(rollupTx => rollupTx.tx);
  }

  interrupt() {
    this.rollupCreator.interrupt();
    this.rollupAggregator.interrupt();
    this.rollupPublisher.interrupt();
  }

  async processPendingTxs(pendingTxs: TxDao[], flush = false) {
    if (this.published) {
      return emptyProfile(this.numInnerRollupTxs * this.numOuterRollupProofs);
    }

    const rollupTimeouts = this.publishTimeManager.calculateLastTimeouts();
    this.initialiseBridgeQueues(rollupTimeouts);
    const bridgeIds = [...this.rollupBridgeIds];
    const assetIds = new Set<AssetId>(this.rollupAssetIds);
    const txs = this.getNextTxsToRollup(pendingTxs, flush, assetIds, bridgeIds);
    try {
      const rollupProfile = await this.aggregateAndPublish(txs, rollupTimeouts, flush);
      this.published = rollupProfile.published;
      return rollupProfile;
    } catch (e) {
      // Probably being interrupted.
      return emptyProfile(this.numInnerRollupTxs * this.numOuterRollupProofs);
    }
  }

  private handleNewDefiTx(
    tx: TxDao,
    remainingTxSlots: number,
    txsForRollup: RollupTx[],
    flush: boolean,
    assetIds: Set<AssetId>,
    bridgeIds: BridgeId[],
  ): RollupTx[] {
    // we have a new defi interaction, we need to determine if it can be accepted and if so whether it gets queued or goes straight on chain.
    const proof = new ProofData(tx.proofData);
    const defiProof = new DefiDepositProofData(proof);
    const rollupTx = createDefiRollupTx(tx, defiProof);

    const addTxs = (txs: RollupTx[]) => {
      for (const tx of txs) {
        txsForRollup.push(tx);
        assetIds.add(tx.feeAsset);
        if (!tx.bridgeId) {
          // this shouldn't be possible
          console.log(`Adding a tx that should be DEFI but it has no bridge id!`);
          continue;
        }
        if (!bridgeIds.some(id => id.equals(tx.bridgeId!))) {
          bridgeIds.push(tx.bridgeId);
        }
      }
    };

    if (bridgeIds.some(id => id.equals(rollupTx.bridgeId!))) {
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

    const bridgeQueue = this.bridgeQueues.get(defiProof.bridgeId.toString());
    if (!bridgeQueue) {
      // We don't have a bridge config for this!!
      console.log(
        `Received transaction for bridge: ${defiProof.bridgeId.toString()} but we have no config for this bridge!!`,
      );
      return txsForRollup;
    }

    //if we are beyond the timeout interval for this bridge then add it straight in
    if (bridgeQueue.transactionHasTimedOut(rollupTx)) {
      addTxs([rollupTx]);
      return txsForRollup;
    }

    // Add this tx to the queue for this bridge and work out if we can put any more txs into the current batch or create a new one
    bridgeQueue.addDefiTx(rollupTx);
    const newTxs = bridgeQueue.getTxsToRollup(
      this.feeResolver,
      remainingTxSlots,
      assetIds,
      RollupProofData.NUMBER_OF_ASSETS,
    );
    addTxs(newTxs);
    return txsForRollup;
  }

  private getNextTxsToRollup(pendingTxs: TxDao[], flush: boolean, assetIds: Set<AssetId>, bridgeIds: BridgeId[]) {
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

      const addTx = () => {
        assetIds.add(assetId);
        txs.push(createRollupTx(tx, proofData));
      };

      const discardTx = () => {
        switch (proofData.allowChain.readUInt32BE(28)) {
          case 1:
            discardedCommitments.push(proofData.noteCommitment1);
            break;
          case 2:
            discardedCommitments.push(proofData.noteCommitment2);
            break;
        }
      };

      if (!assetIds.has(assetId) && assetIds.size === RollupProofData.NUMBER_OF_ASSETS) {
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

  private printRollupState(rollupProfile: RollupProfile, timeout: boolean) {
    console.log(
      `New rollup - size: ${rollupProfile.rollupSize}, numTxs: ${
        rollupProfile.totalTxs
      }, timeout: ${timeout}, gas balance: ${rollupProfile.totalGasEarnt - rollupProfile.totalGasCost}`,
    );
    for (const bp of rollupProfile.bridgeProfiles) {
      console.log(
        `Defi bridge published. Id: ${bp.bridgeId.toString()}, numTxs: ${bp.numTxs}, gas balance: ${
          bp.totalGasEarnt - bp.totalGasCost
        }`,
      );
    }
  }

  private updateRollupBridgesAndAssets(txs: RollupTx[]) {
    for (const tx of txs) {
      if (isDefiDeposit(tx.tx.txType) && tx.bridgeId && !this.rollupBridgeIds.some(id => id.equals(tx.bridgeId!))) {
        this.rollupBridgeIds.push(tx.bridgeId!);
      }
      this.rollupAssetIds.add(tx.feeAsset);
    }
  }

  private async aggregateAndPublish(txs: RollupTx[], rollupTimeouts: RollupTimeouts, flush: boolean) {
    const pendingTxs = [...txs];

    const allRollupTxs = [...this.txs, ...pendingTxs];
    const rollupProfile = profileRollup(
      allRollupTxs,
      this.bridgeConfigs,
      this.feeResolver,
      this.numInnerRollupTxs * this.numOuterRollupProofs,
      this.bridgeCostResolver,
    );

    // determine whether we should publish a new rollup
    // either because we have been told to flush, because the rollup is fully paid for, or we have one or more tx that has 'timed out'
    const profit = rollupProfile.totalGasEarnt >= rollupProfile.totalGasCost;
    const timedout = rollupTimeouts.baseTimeout
      ? rollupProfile.earliestTx.getTime() <= rollupTimeouts.baseTimeout.timeout.getTime()
      : false;
    const shouldPublish = flush || profit || timedout;
    while (
      ((shouldPublish && pendingTxs.length) || pendingTxs.length >= this.numInnerRollupTxs) &&
      this.innerProofs.length < this.numOuterRollupProofs
    ) {
      const txs = this.reorderTxs(pendingTxs.splice(0, this.numInnerRollupTxs));
      const rollupProofDao = await this.rollupCreator.create(txs.map(rollupTx => rollupTx.tx));
      this.updateRollupBridgesAndAssets(txs);
      this.txs = [...this.txs, ...txs];
      this.innerProofs.push(rollupProofDao);
    }

    if (!this.innerProofs.length) {
      // nothing to publish
      return rollupProfile;
    }
    if (this.innerProofs.length < this.numOuterRollupProofs && !shouldPublish) {
      // rollup isn't full and we are not pre-empitvely publishing
      return rollupProfile;
    }

    const rollupDao = await this.rollupAggregator.aggregateRollupProofs(
      this.innerProofs,
      this.oldDefiRoot,
      this.oldDefiPath,
      this.defiInteractionNotes,
      this.rollupBridgeIds.concat(
        Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK - this.rollupBridgeIds.length).fill(BridgeId.ZERO),
      ),
      [...this.rollupAssetIds],
      this.rollupPublisher.getRollupBenificiary(),
    );
    rollupProfile.published = await this.rollupPublisher.publishRollup(rollupDao);
    this.printRollupState(rollupProfile, timedout);
    return rollupProfile;
  }

  private reorderTxs(txs: RollupTx[]) {
    const sorted = [...txs];
    const proofs = txs.map(tx => new ProofData(tx.tx.proofData));
    for (let i = 0; i < txs.length; ++i) {
      const { backwardLink } = proofs[i];
      const insertAfter = proofs.findIndex(
        p => p.noteCommitment1.equals(backwardLink) || p.noteCommitment2.equals(backwardLink),
      );
      if (insertAfter >= 0) {
        const [proof] = proofs.splice(i, 1);
        const [tx] = sorted.splice(i, 1);
        proofs.splice(insertAfter + 1, 0, proof);
        sorted.splice(insertAfter + 1, 0, tx);
      }
    }
    return sorted;
  }
}

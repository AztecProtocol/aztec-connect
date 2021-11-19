import { AssetId } from '@aztec/barretenberg/asset';
import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofData } from '@aztec/barretenberg/client_proofs';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import moment from 'moment';
import { RollupProofDao } from '../entity/rollup_proof';
import { TxDao } from '../entity/tx';
import { RollupAggregator } from '../rollup_aggregator';
import { RollupCreator } from '../rollup_creator';
import { RollupPublisher } from '../rollup_publisher';
import { PublishTimeManager } from './publish_time_manager';

export class RollupCoordinator {
  private innerProofs: RollupProofDao[] = [];
  private txs: TxDao[] = [];
  private bridgeIds: BridgeId[] = [];
  private assetIds: Set<AssetId> = new Set();
  private published = false;

  constructor(
    private publishTimeManager: PublishTimeManager,
    private rollupCreator: RollupCreator,
    private rollupAggregator: RollupAggregator,
    private rollupPublisher: RollupPublisher,
    private numInnerRollupTxs: number,
    private numOuterRollupProofs: number,
    private oldDefiRoot: Buffer,
    private oldDefiPath: HashPath,
    private defiInteractionNotes: DefiInteractionNote[] = [],
  ) {}

  get processedTxs() {
    return this.txs;
  }

  interrupt() {
    this.rollupCreator.interrupt();
    this.rollupAggregator.interrupt();
    this.rollupPublisher.interrupt();
  }

  async processPendingTxs(pendingTxs: TxDao[], flush = false) {
    if (this.published) {
      return false;
    }

    const txs = this.getNextTxsToRollup(pendingTxs);
    this.publishTimeManager.update([...this.txs, ...txs]);
    const publishTime = this.publishTimeManager.getPublishTime();
    const isTimeToPublish = flush || moment(publishTime).isSameOrBefore();
    try {
      this.published = await this.aggregateAndPublish(txs, isTimeToPublish);
      return this.published;
    } catch (e) {
      // Probably being interrupted.
      return false;
    }
  }

  private getNextTxsToRollup(pendingTxs: TxDao[]) {
    const remainingTxSlots = this.numInnerRollupTxs * (this.numOuterRollupProofs - this.innerProofs.length);
    const sortedTxs = [...pendingTxs].sort((a, b) =>
      a.txType === TxType.DEFI_CLAIM && a.txType !== b.txType ? -1 : 1,
    );
    const txs: TxDao[] = [];
    const discardedCommitments: Buffer[] = [];
    for (let i = 0; i < sortedTxs.length && txs.length < remainingTxSlots; ++i) {
      const tx = sortedTxs[i];
      if (tx.txType === TxType.ACCOUNT) {
        txs.push(tx);
        continue;
      }

      const proofData = new ProofData(tx.proofData);
      const assetId = proofData.txFeeAssetId.readUInt32BE(28);

      const addTx = () => {
        this.assetIds.add(assetId);
        txs.push(tx);
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

      if (!this.assetIds.has(assetId) && this.assetIds.size === RollupProofData.NUMBER_OF_ASSETS) {
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

      const bridgeId = BridgeId.fromBuffer(proofData.bridgeId);
      if (tx.txType !== TxType.DEFI_DEPOSIT) {
        addTx();
      } else if (this.bridgeIds.some(id => id.equals(bridgeId))) {
        addTx();
      } else if (this.bridgeIds.length < RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK) {
        this.bridgeIds.push(bridgeId);
        addTx();
      } else {
        discardTx();
      }
    }
    return txs;
  }

  private async aggregateAndPublish(txs: TxDao[], isTimeToPublish: boolean) {
    const pendingTxs = [...txs];
    while (
      ((isTimeToPublish && pendingTxs.length) || pendingTxs.length >= this.numInnerRollupTxs) &&
      this.innerProofs.length < this.numOuterRollupProofs
    ) {
      const txs = this.reorderTxs(pendingTxs.splice(0, this.numInnerRollupTxs));
      const rollupProofDao = await this.rollupCreator.create(txs);
      this.txs = [...this.txs, ...txs];
      this.innerProofs.push(rollupProofDao);
    }

    if ((isTimeToPublish && this.innerProofs.length) || this.innerProofs.length === this.numOuterRollupProofs) {
      const rollupDao = await this.rollupAggregator.aggregateRollupProofs(
        this.innerProofs,
        this.oldDefiRoot,
        this.oldDefiPath,
        this.defiInteractionNotes,
        this.bridgeIds.concat(
          Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK - this.bridgeIds.length).fill(BridgeId.ZERO),
        ),
        [...this.assetIds],
      );
      return this.rollupPublisher.publishRollup(rollupDao);
    }

    return false;
  }

  private reorderTxs(txs: TxDao[]) {
    const sorted = [...txs];
    const proofs = txs.map(tx => new ProofData(tx.proofData));
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

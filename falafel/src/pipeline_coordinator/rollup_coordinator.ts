import { TxType } from '@aztec/barretenberg/blockchain';
import { DefiDepositProofData, ProofData } from '@aztec/barretenberg/client_proofs';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
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
import { AssetId } from '@aztec/barretenberg/asset';

export class RollupCoordinator {
  private interrupted = false;
  private flush = false;
  private published = false;
  private innerProofs: RollupProofDao[] = [];
  private txs: TxDao[] = [];
  private bridgeIds: BridgeId[] = [];
  private assetIds: Set<AssetId> = new Set([AssetId.ETH]);

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
  ) { }

  get processedTxs() {
    return this.txs;
  }

  flushTxs() {
    this.flush = true;
  }

  interrupt() {
    this.interrupted = true;
    this.rollupCreator.interrupt();
    this.rollupAggregator.interrupt();
    this.rollupPublisher.interrupt();
  }

  async processPendingTxs(pendingTxs: TxDao[]) {
    if (this.interrupted || this.published) {
      return false;
    }

    const txs = await this.getNextTxsToRollup(pendingTxs);
    this.publishTimeManager.update([...this.txs, ...txs]);
    const publishTime = this.publishTimeManager.getPublishTime();
    return this.aggregateAndPublish(txs, publishTime);
  }

  private async getNextTxsToRollup(pendingTxs: TxDao[]) {
    const remainingTxSlots = this.numInnerRollupTxs * (this.numOuterRollupProofs - this.innerProofs.length);
    const sortedTxs = [...pendingTxs].sort((a, b) =>
      a.txType === TxType.DEFI_CLAIM && a.txType !== b.txType ? -1 : 1,
    );
    const txs: TxDao[] = [];
    for (let i = 0; i < sortedTxs.length && txs.length < remainingTxSlots; ++i) {
      const tx = sortedTxs[i];
      const proofData = new ProofData(tx.proofData);
      const assetId = tx.txType === TxType.ACCOUNT
        ? 0
        : [TxType.DEFI_DEPOSIT, TxType.DEFI_CLAIM].includes(tx.txType)
          ? BridgeId.fromBuffer(proofData.assetId).inputAssetId
          : proofData.assetId.readUInt32BE(28);
      if (!this.assetIds.has(assetId) && this.assetIds.size === RollupProofData.NUMBER_OF_ASSETS) {
        continue;
      }
      const addTx = (tx: TxDao) => {
        this.assetIds.add(assetId);
        txs.push(tx);
      }
      if (tx.txType !== TxType.DEFI_DEPOSIT) {
        addTx(tx);
      } else {
        const { bridgeId } = new DefiDepositProofData(proofData);
        if (this.bridgeIds.some(id => id.equals(bridgeId))) {
          addTx(tx);
        } else if (this.bridgeIds.length < RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK) {
          this.bridgeIds.push(bridgeId);
          addTx(tx);
        }
      }
    }
    return txs;
  }

  private async aggregateAndPublish(txs: TxDao[], publishTime: Date) {
    if (moment(publishTime).isSameOrBefore()) {
      this.flush = true;
    }

    const pendingTxs = [...txs];
    while (
      !this.interrupted &&
      ((this.flush && pendingTxs.length) || pendingTxs.length >= this.numInnerRollupTxs) &&
      this.innerProofs.length < this.numOuterRollupProofs
    ) {
      const txs = pendingTxs.splice(0, this.numInnerRollupTxs);
      const rollupProofDao = await this.rollupCreator.create(txs);
      this.txs = [...this.txs, ...txs];
      this.innerProofs.push(rollupProofDao);
    }

    if (
      !this.interrupted &&
      this.innerProofs.length &&
      (this.flush || this.innerProofs.length === this.numOuterRollupProofs)
    ) {
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
      if (!this.interrupted) {
        this.published = await this.rollupPublisher.publishRollup(rollupDao);
        return this.published;
      }
    }

    return false;
  }
}

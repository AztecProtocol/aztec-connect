import { TxDao } from '../entity/tx';
import { RollupProofDao } from '../entity/rollup_proof';
import { RollupDao } from '../entity/rollup';
import { SyncRollupDb } from './sync_rolllup_db';
import { TxHash } from 'barretenberg/tx_hash';
import { JoinSplitTxDao } from '../entity/join_split_tx';
import { ProofData, ProofId } from 'barretenberg/client_proofs/proof_data';
import { AccountTxDao } from '../entity/account_tx';

export class CachedRollupDb extends SyncRollupDb {
  private pendingTxCount?: number;
  private unsettledTxCount?: number;
  private nextRollupId?: number;
  private totalTxCount?: number;
  private numSettledRollups?: number;
  private rollups?: RollupDao[];
  private unsettledJoinSplitTxs?: JoinSplitTxDao[];
  private unsettledAccountTxs?: AccountTxDao[];

  public async getPendingTxCount() {
    if (this.pendingTxCount === undefined) {
      this.pendingTxCount = await super.getPendingTxCount();
    }
    return this.pendingTxCount;
  }

  public async getRollups(take: number, skip = 0) {
    if (!skip && take === 5) {
      if (!this.rollups) {
        this.rollups = await super.getRollups(take, skip);
      }
      return this.rollups;
    }
    return await super.getRollups(take, skip);
  }

  public async getNumSettledRollups() {
    if (this.numSettledRollups === undefined) {
      this.numSettledRollups = await super.getNumSettledRollups();
    }
    return this.numSettledRollups;
  }

  public async getUnsettledTxCount() {
    if (this.unsettledTxCount === undefined) {
      this.unsettledTxCount = await super.getUnsettledTxCount();
    }
    return this.unsettledTxCount;
  }

  public async getUnsettledJoinSplitTxs() {
    if (this.unsettledJoinSplitTxs === undefined) {
      this.unsettledJoinSplitTxs = await super.getUnsettledJoinSplitTxs();
    }
    return this.unsettledJoinSplitTxs;
  }
  public async getUnsettledAccountTxs() {
    if (this.unsettledAccountTxs === undefined) {
      this.unsettledAccountTxs = await super.getUnsettledAccountTxs();
    }
    return this.unsettledAccountTxs;
  }

  public async getNextRollupId() {
    if (this.nextRollupId === undefined) {
      this.nextRollupId = await super.getNextRollupId();
    }
    return this.nextRollupId;
  }

  public async getTotalTxCount() {
    if (!this.totalTxCount) {
      this.totalTxCount = await super.getTotalTxCount();
    }
    return this.totalTxCount;
  }

  public async addTx(txDao: TxDao) {
    const addedTx = await super.addTx(txDao);
    const { proofId } = new ProofData(txDao.proofData);

    switch (proofId) {
      case ProofId.JOIN_SPLIT: {
        if (!this.unsettledJoinSplitTxs) {
          this.unsettledJoinSplitTxs = [];
        }
        this.unsettledJoinSplitTxs?.push(addedTx as JoinSplitTxDao);
        break;
      }
      case ProofId.ACCOUNT: {
        if (!this.unsettledAccountTxs) {
          this.unsettledAccountTxs = [];
        }
        this.unsettledAccountTxs?.push(addedTx as AccountTxDao);
        break;
      }
    }

    this.purge();
    return addedTx;
  }

  public async deletePendingTxs() {
    await super.deletePendingTxs();
    this.purge();
  }

  public async addRollupProof(rollupDao: RollupProofDao) {
    await super.addRollupProof(rollupDao);
    this.purge();
  }

  public async deleteRollupProof(id: Buffer) {
    await super.deleteRollupProof(id);
    this.purge();
    this.purgeRollupCaches();
  }

  public async deleteTxlessRollupProofs() {
    await super.deleteTxlessRollupProofs();
    this.purge();
  }

  public async deleteOrphanedRollupProofs() {
    await super.deleteOrphanedRollupProofs();
    this.purge();
  }

  public async addRollup(rollup: RollupDao) {
    const result = await super.addRollup(rollup);
    this.purge();
    this.purgeRollupCaches();
    return result;
  }

  public async confirmMined(id: number, gasUsed: number, gasPrice: bigint, mined: Date, ethTxHash: TxHash) {
    await super.confirmMined(id, gasUsed, gasPrice, mined, ethTxHash);
    this.nextRollupId = undefined;
    this.purge();
    this.purgeRollupCaches();
    this.purgePendingTxs();
    this.unsettledAccountTxs = await this.getUnsettledAccountTxs();
    this.unsettledJoinSplitTxs = await this.getUnsettledJoinSplitTxs();
  }

  public async deleteUnsettledRollups() {
    await super.deleteUnsettledRollups();
    this.purgeRollupCaches();
    this.purge();
  }

  private purgeRollupCaches = () => {
    this.rollups = undefined;
    this.numSettledRollups = undefined;
  };

  private purgePendingTxs = () => {
    this.unsettledJoinSplitTxs = undefined;
    this.unsettledAccountTxs = undefined;
  };

  private purge = () => {
    this.pendingTxCount = undefined;
    this.unsettledTxCount = undefined;
    this.totalTxCount = undefined;
  };
}

import { TxDao } from '../entity/tx';
import { RollupProofDao } from '../entity/rollup_proof';
import { RollupDao } from '../entity/rollup';
import { SyncRollupDb } from './sync_rolllup_db';
import { TxHash } from 'barretenberg/tx_hash';

export class CachedRollupDb extends SyncRollupDb {
  private pendingTxCount?: number;
  private unsettledTxCount?: number;
  private nextRollupId?: number;
  private totalTxCount?: number;
  private numSettledRollups?: number;
  private rollups?: RollupDao[];

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
    await super.addTx(txDao);
    this.purge();
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

  private purge = () => {
    this.pendingTxCount = undefined;
    this.unsettledTxCount = undefined;
    this.totalTxCount = undefined;
  };
}

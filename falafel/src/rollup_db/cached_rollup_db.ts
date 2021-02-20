import { TxDao } from '../entity/tx';
import { RollupProofDao } from '../entity/rollup_proof';
import { RollupDao } from '../entity/rollup';
import { SyncRollupDb } from './sync_rolllup_db';

export class CachedRollupDb extends SyncRollupDb {
  private pendingTxCount?: number;
  private unsettledTxCount?: number;
  private nextRollupId?: number;

  public async getPendingTxCount() {
    if (this.pendingTxCount === undefined) {
      this.pendingTxCount = await super.getPendingTxCount();
    }
    return this.pendingTxCount;
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
    return result;
  }

  public async confirmMined(id: number, gasUsed: number, gasPrice: bigint, mined: Date) {
    await super.confirmMined(id, gasUsed, gasPrice, mined);
    this.nextRollupId = undefined;
    this.purge();
  }

  public async deleteUnsettledRollups() {
    await super.deleteUnsettledRollups();
    this.purge();
  }

  private purge = () => {
    this.pendingTxCount = undefined;
    this.unsettledTxCount = undefined;
  };
}

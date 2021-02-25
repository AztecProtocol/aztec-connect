import { TxDao } from '../entity/tx';
import { RollupProofDao } from '../entity/rollup_proof';
import { RollupDao } from '../entity/rollup';
import { SyncRollupDb } from './sync_rollup_db';
import { TxHash } from 'barretenberg/tx_hash';
import { JoinSplitTxDao } from '../entity/join_split_tx';
import { ProofData, ProofId } from 'barretenberg/client_proofs/proof_data';
import { AccountTxDao } from '../entity/account_tx';

export class CachedRollupDb extends SyncRollupDb {
  private pendingTxCount?: number;
  private unsettledTxCount?: number;
  private totalTxCount?: number;
  private rollups: RollupDao[] = [];
  private settledRollups: RollupDao[] = [];
  private unsettledJoinSplitTxs?: JoinSplitTxDao[];
  private unsettledAccountTxs?: AccountTxDao[];

  public async init() {
    await this.refreshRollups();
  }

  public async refreshRollups() {
    this.rollups = await super.getRollups();
    this.settledRollups = this.rollups.filter(rollup => rollup.mined);
    console.log(`Db cache loaded ${this.rollups.length} rollups from db...`);
  }

  public async getPendingTxCount() {
    if (this.pendingTxCount === undefined) {
      this.pendingTxCount = await super.getPendingTxCount();
    }
    return this.pendingTxCount;
  }

  public async getRollup(id: number) {
    return this.rollups[id];
  }

  public async getRollups(take?: number, skip = 0, descending = false) {
    const rollups = descending ? this.rollups.slice().reverse() : this.rollups;
    return rollups.slice(skip, take ? skip + take : undefined);
  }

  public async getNumSettledRollups() {
    return this.settledRollups.length;
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

  public async getSettledRollups(from = 0) {
    return this.settledRollups.slice(from);
  }

  public async getLastSettledRollup() {
    return this.settledRollups.length ? this.settledRollups[this.settledRollups.length - 1] : undefined;
  }

  public async getNextRollupId() {
    if (this.settledRollups.length === 0) {
      return 0;
    }
    return this.settledRollups[this.settledRollups.length - 1].id + 1;
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

    this.purgeTxCounters();
    return addedTx;
  }

  public async deletePendingTxs() {
    await super.deletePendingTxs();
    this.purgeTxCounters();
  }

  public async addRollupProof(rollupDao: RollupProofDao) {
    await super.addRollupProof(rollupDao);
    this.purgeTxCounters();
  }

  public async deleteRollupProof(id: Buffer) {
    await super.deleteRollupProof(id);
    this.purgeTxCounters();
  }

  public async deleteTxlessRollupProofs() {
    await super.deleteTxlessRollupProofs();
    this.purgeTxCounters();
  }

  public async deleteOrphanedRollupProofs() {
    await super.deleteOrphanedRollupProofs();
    this.purgeTxCounters();
  }

  public async addRollup(rollup: RollupDao) {
    await super.addRollup(rollup);
    this.rollups[rollup.id] = rollup;
    if (rollup.mined) {
      this.settledRollups[rollup.id] = rollup;
    }
    this.purgeTxCounters();
  }

  public async confirmMined(id: number, gasUsed: number, gasPrice: bigint, mined: Date, ethTxHash: TxHash) {
    const rollup = await super.confirmMined(id, gasUsed, gasPrice, mined, ethTxHash);
    this.purgeTxCounters();
    this.settledRollups[rollup.id] = rollup;
    this.unsettledJoinSplitTxs = undefined;
    this.unsettledAccountTxs = undefined;
    return rollup;
  }

  public async deleteUnsettledRollups() {
    await super.deleteUnsettledRollups();
    this.rollups = this.settledRollups.slice();
    this.purgeTxCounters();
  }

  private purgeTxCounters = () => {
    this.pendingTxCount = undefined;
    this.unsettledTxCount = undefined;
    this.totalTxCount = undefined;
  };
}

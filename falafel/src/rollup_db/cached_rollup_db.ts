import { TxDao } from '../entity/tx';
import { RollupProofDao } from '../entity/rollup_proof';
import { RollupDao } from '../entity/rollup';
import { SyncRollupDb } from './sync_rollup_db';
import { TxHash } from 'barretenberg/tx_hash';
import { JoinSplitTxDao } from '../entity/join_split_tx';
import { ProofData, ProofId } from 'barretenberg/client_proofs/proof_data';
import { AccountTxDao } from '../entity/account_tx';
import { toBigIntBE } from 'bigint-buffer';

export class CachedRollupDb extends SyncRollupDb {
  private pendingTxCount!: number;
  private unsettledTxCount!: number;
  private totalTxCount!: number;
  private rollups: RollupDao[] = [];
  private settledRollups: RollupDao[] = [];
  private unsettledJoinSplitTxs!: JoinSplitTxDao[];
  private unsettledAccountTxs!: AccountTxDao[];
  private settledNullifiers = new Set<bigint>();
  private unsettledNullifiers: Buffer[] = [];

  public async init() {
    this.rollups = await super.getRollups();
    this.settledRollups = this.rollups.filter(rollup => rollup.mined);
    this.rollups
      .map(r => r.rollupProof.txs.map(tx => [tx.nullifier1, tx.nullifier2]).flat())
      .flat()
      .forEach(n => this.settledNullifiers.add(toBigIntBE(n)));
    console.log(
      `Db cache loaded ${this.rollups.length} rollups and ${this.settledNullifiers.size} nullifiers from db...`,
    );

    await this.refresh();
    console.log(`Refreshed state.`);
  }

  public async refresh() {
    this.pendingTxCount = await super.getPendingTxCount();
    this.unsettledTxCount = await super.getUnsettledTxCount();
    this.unsettledJoinSplitTxs = await super.getUnsettledJoinSplitTxs();
    this.unsettledAccountTxs = await super.getUnsettledAccountTxs();
    this.unsettledNullifiers = await super.getUnsettledNullifiers();
  }

  public async getPendingTxCount() {
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
    return this.unsettledTxCount;
  }

  public async getUnsettledJoinSplitTxs() {
    return this.unsettledJoinSplitTxs;
  }

  public async getUnsettledAccountTxs() {
    return this.unsettledAccountTxs;
  }

  public async getUnsettledNullifiers() {
    return this.unsettledNullifiers;
  }

  public async nullifiersExist(n1: Buffer, n2: Buffer) {
    return (
      this.settledNullifiers.has(toBigIntBE(n1)) ||
      this.settledNullifiers.has(toBigIntBE(n2)) ||
      this.unsettledNullifiers.findIndex(b => b.equals(n1) || b.equals(n2)) != -1
    );
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
    const { proofId, nullifier1, nullifier2 } = new ProofData(txDao.proofData);

    this.unsettledNullifiers.push(nullifier1, nullifier2);

    switch (proofId) {
      case ProofId.JOIN_SPLIT: {
        this.unsettledJoinSplitTxs.push(addedTx as JoinSplitTxDao);
        break;
      }
      case ProofId.ACCOUNT: {
        this.unsettledAccountTxs.push(addedTx as AccountTxDao);
        break;
      }
    }

    this.pendingTxCount++;
    this.unsettledTxCount++;
    this.totalTxCount++;

    return addedTx;
  }

  public async deletePendingTxs() {
    await super.deletePendingTxs();
    await this.refresh();
  }

  public async addRollupProof(rollupDao: RollupProofDao) {
    await super.addRollupProof(rollupDao);
    await this.refresh();
  }

  public async deleteRollupProof(id: Buffer) {
    await super.deleteRollupProof(id);
    await this.refresh();
  }

  public async deleteOrphanedRollupProofs() {
    await super.deleteOrphanedRollupProofs();
    await this.refresh();
  }

  public async addRollup(rollup: RollupDao) {
    await super.addRollup(rollup);
    this.rollups[rollup.id] = rollup;
    if (rollup.mined) {
      this.settledRollups[rollup.id] = rollup;
    }
  }

  public async confirmMined(id: number, gasUsed: number, gasPrice: bigint, mined: Date, ethTxHash: TxHash) {
    const rollup = await super.confirmMined(id, gasUsed, gasPrice, mined, ethTxHash);
    this.rollups[rollup.id] = rollup;
    this.settledRollups[rollup.id] = rollup;
    rollup.rollupProof.txs
      .map(tx => [tx.nullifier1, tx.nullifier2])
      .flat()
      .forEach(n => this.settledNullifiers.add(toBigIntBE(n)));
    await this.refresh();
    return rollup;
  }

  public async deleteUnsettledRollups() {
    await super.deleteUnsettledRollups();
    this.rollups = this.settledRollups.slice();
  }
}

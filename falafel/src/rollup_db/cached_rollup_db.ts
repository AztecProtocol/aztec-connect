import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { TxHash, TxType } from '@aztec/barretenberg/blockchain';
import { ProofData } from '@aztec/barretenberg/client_proofs';
import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { AssetMetricsDao, RollupDao, RollupProofDao, TxDao } from '../entity';
import { SyncRollupDb } from './sync_rollup_db';

export class CachedRollupDb extends SyncRollupDb {
  private pendingTxCount!: number;
  private totalTxCount!: number;
  private rollups: RollupDao[] = [];
  private settledRollups: RollupDao[] = [];
  private unsettledTxs!: TxDao[];
  private settledNullifiers = new Set<bigint>();
  private unsettledNullifiers: Buffer[] = [];

  public async init() {
    this.rollups = await super.getRollups();
    this.settledRollups = this.rollups.filter(rollup => rollup.mined);
    this.rollups
      .map(r => r.rollupProof.txs.map(tx => [tx.nullifier1, tx.nullifier2]).flat())
      .flat()
      .forEach(n => n && this.settledNullifiers.add(toBigIntBE(n)));
    console.log(
      `Db cache loaded ${this.rollups.length} rollups and ${this.settledNullifiers.size} nullifiers from db...`,
    );

    await this.refresh();
  }

  private async refresh() {
    const start = new Date().getTime();
    this.totalTxCount = await super.getTotalTxCount();
    this.pendingTxCount = await super.getPendingTxCount();
    this.unsettledTxs = await super.getUnsettledTxs();
    this.unsettledNullifiers = await super.getUnsettledNullifiers();
    console.log(`Refreshed db cache in ${new Date().getTime() - start}ms.`);
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
    return this.unsettledTxs.length;
  }

  public async getUnsettledTxs() {
    return this.unsettledTxs;
  }

  public async getUnsettledPaymentTxs() {
    return this.unsettledTxs.filter(tx => tx.txType < TxType.ACCOUNT);
  }

  public async getUnsettledAccountTxs() {
    return this.unsettledTxs.filter(tx => tx.txType === TxType.ACCOUNT);
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
    return this.totalTxCount;
  }

  public async addTx(txDao: TxDao) {
    await super.addTx(txDao);

    const { nullifier1, nullifier2 } = new ProofData(txDao.proofData);
    [nullifier1, nullifier2].filter(n => !!toBigIntBE(n)).forEach(n => this.unsettledNullifiers.push(n));

    this.unsettledTxs.push(txDao);
    this.pendingTxCount++;
    this.totalTxCount++;
  }

  public async addTxs(txs: TxDao[]) {
    await super.addTxs(txs);

    txs
      .map(tx => new ProofData(tx.proofData))
      .map(p => [p.nullifier1, p.nullifier2])
      .flat()
      .filter(n => !!toBigIntBE(n))
      .forEach(n => this.unsettledNullifiers.push(n));

    this.unsettledTxs.push(...txs);
    this.pendingTxCount += txs.length;
    this.totalTxCount += txs.length;
  }

  public async deleteTxsById(ids: Buffer[]) {
    await super.deleteTxsById(ids);
    await this.refresh();
  }

  public async addRollupProof(rollupDao: RollupProofDao) {
    await super.addRollupProof(rollupDao);
    await this.refresh();
  }

  public async addRollupProofs(rollupDaos: RollupProofDao[]) {
    await super.addRollupProofs(rollupDaos);
    await this.refresh();
  }

  public async addRollup(rollup: RollupDao) {
    await super.addRollup(rollup);
    this.rollups[rollup.id] = rollup;

    if (rollup.mined) {
      this.settledRollups[rollup.id] = rollup;
      rollup.rollupProof.txs
        .map(tx => [tx.nullifier1, tx.nullifier2])
        .flat()
        .forEach(n => n && this.settledNullifiers.add(toBigIntBE(n)));
    }

    await this.refresh();
  }

  public async confirmMined(
    id: number,
    gasUsed: number,
    gasPrice: bigint,
    mined: Date,
    ethTxHash: TxHash,
    interactionResult: DefiInteractionNote[],
    txIds: Buffer[],
    assetMetrics: AssetMetricsDao[],
    subtreeRoot: Buffer,
  ) {
    const rollup = await super.confirmMined(
      id,
      gasUsed,
      gasPrice,
      mined,
      ethTxHash,
      interactionResult,
      txIds,
      assetMetrics,
      subtreeRoot,
    );
    this.rollups[rollup.id] = rollup;
    this.settledRollups[rollup.id] = rollup;
    rollup.rollupProof.txs
      .map(tx => [tx.nullifier1, tx.nullifier2])
      .flat()
      .forEach(n => n && this.settledNullifiers.add(toBigIntBE(n)));
    await this.refresh();
    return rollup;
  }

  public async deletePendingTxs() {
    await super.deletePendingTxs();
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

  public async deleteUnsettledRollups() {
    await super.deleteUnsettledRollups();
    this.rollups = this.settledRollups.slice();
  }
}

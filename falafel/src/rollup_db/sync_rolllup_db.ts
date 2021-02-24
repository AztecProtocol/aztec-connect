import { Mutex } from 'async-mutex';
import { TxHash } from 'barretenberg/tx_hash';
import { RollupDao } from '../entity/rollup';
import { RollupProofDao } from '../entity/rollup_proof';
import { TxDao } from '../entity/tx';
import { RollupDb } from './rollup_db';

export class SyncRollupDb {
  private writeMutex = new Mutex();

  constructor(private rollupDb: RollupDb) {}

  public async addTx(txDao: TxDao) {
    return this.synchronise(() => this.rollupDb.addTx(txDao));
  }

  public async getTx(txId: Buffer) {
    return this.synchronise(() => this.rollupDb.getTx(txId));
  }

  public async getTxsByTxIds(txIds: Buffer[]) {
    return this.synchronise(() => this.rollupDb.getTxsByTxIds(txIds));
  }

  public async getLatestTxs(take: number) {
    return this.synchronise(() => this.rollupDb.getLatestTxs(take));
  }

  public async getPendingTxCount() {
    return this.synchronise(() => this.rollupDb.getPendingTxCount());
  }

  public async deletePendingTxs() {
    return this.synchronise(() => this.rollupDb.deletePendingTxs());
  }

  public async getTotalTxCount() {
    return this.synchronise(() => this.rollupDb.getTotalTxCount());
  }

  public async getJoinSplitTxCount() {
    return this.synchronise(() => this.rollupDb.getJoinSplitTxCount());
  }

  public async getAccountTxCount() {
    return this.synchronise(() => this.rollupDb.getAccountTxCount());
  }

  public async getRegistrationTxCount() {
    return this.synchronise(() => this.rollupDb.getRegistrationTxCount());
  }

  public async getTotalRollupsOfSize(rollupSize: number) {
    return this.synchronise(() => this.rollupDb.getTotalRollupsOfSize(rollupSize));
  }

  public async getUnsettledTxCount() {
    return this.synchronise(() => this.rollupDb.getUnsettledTxCount());
  }

  public async getUnsettledJoinSplitTxs() {
    return this.synchronise(() => this.rollupDb.getUnsettledJoinSplitTxs());
  }

  public async getUnsettledAccountTxs() {
    return this.synchronise(() => this.rollupDb.getUnsettledAccountTxs());
  }

  public async getPendingTxs(take?: number) {
    return this.synchronise(() => this.rollupDb.getPendingTxs(take));
  }

  public async getPendingNoteNullifiers() {
    return this.synchronise(() => this.rollupDb.getPendingNoteNullifiers());
  }

  public async nullifiersExist(n1: Buffer, n2: Buffer) {
    return this.synchronise(() => this.rollupDb.nullifiersExist(n1, n2));
  }

  public async addRollupProof(rollupDao: RollupProofDao) {
    return this.synchronise(() => this.rollupDb.addRollupProof(rollupDao));
  }

  public async getRollupProof(id: Buffer, includeTxs = false) {
    return this.synchronise(() => this.rollupDb.getRollupProof(id, includeTxs));
  }

  public async deleteRollupProof(id: Buffer) {
    return this.synchronise(() => this.rollupDb.deleteRollupProof(id));
  }

  public async deleteTxlessRollupProofs() {
    return this.synchronise(() => this.rollupDb.deleteTxlessRollupProofs());
  }

  public async deleteOrphanedRollupProofs() {
    return this.synchronise(() => this.rollupDb.deleteOrphanedRollupProofs());
  }

  public async getRollupProofsBySize(numTxs: number) {
    return this.synchronise(() => this.rollupDb.getRollupProofsBySize(numTxs));
  }

  public async getNumRollupProofsBySize(numTxs: number) {
    return this.synchronise(() => this.rollupDb.getNumRollupProofsBySize(numTxs));
  }

  public async getNextRollupId() {
    return this.synchronise(() => this.rollupDb.getNextRollupId());
  }

  public async getRollup(id: number) {
    return this.synchronise(() => this.rollupDb.getRollup(id));
  }

  public async getRollups(take: number, skip?: number) {
    return this.synchronise(() => this.rollupDb.getRollups(take, skip));
  }

  public async getNumSettledRollups() {
    return this.synchronise(() => this.rollupDb.getNumSettledRollups());
  }

  public async addRollup(rollup: RollupDao) {
    return this.synchronise(() => this.rollupDb.addRollup(rollup));
  }

  public async setCallData(id: number, callData: Buffer) {
    return this.synchronise(() => this.rollupDb.setCallData(id, callData));
  }

  public async confirmSent(id: number, txHash: TxHash) {
    return this.synchronise(() => this.rollupDb.confirmSent(id, txHash));
  }

  public async confirmMined(id: number, gasUsed: number, gasPrice: bigint, mined: Date, ethTxHash: TxHash) {
    return this.synchronise(() => this.rollupDb.confirmMined(id, gasUsed, gasPrice, mined, ethTxHash));
  }

  public getSettledRollups(from = 0, descending = false, take?: number) {
    return this.synchronise(() => this.rollupDb.getSettledRollups(from, descending, take));
  }

  public getUnsettledRollups() {
    return this.synchronise(() => this.rollupDb.getUnsettledRollups());
  }

  public async deleteUnsettledRollups() {
    return this.synchronise(() => this.rollupDb.deleteUnsettledRollups());
  }

  public async getRollupByDataRoot(dataRoot: Buffer) {
    return this.synchronise(() => this.rollupDb.getRollupByDataRoot(dataRoot));
  }

  public async getDataRootsIndex(root: Buffer) {
    return this.synchronise(() => this.rollupDb.getDataRootsIndex(root));
  }

  private async synchronise<T>(fn: () => Promise<T>) {
    const release = await this.writeMutex.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { Mutex } from 'async-mutex';
import { AccountDao } from '../entity/account';
import { AssetMetricsDao } from '../entity/asset_metrics';
import { ClaimDao } from '../entity/claim';
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

  public async addAccounts(accounts: AccountDao[]) {
    return this.synchronise(() => this.rollupDb.addAccounts(accounts));
  }

  public async getTx(txId: Buffer) {
    return this.synchronise(() => this.rollupDb.getTx(txId));
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

  public async getDefiTxCount() {
    return this.synchronise(() => this.rollupDb.getDefiTxCount());
  }

  public async getAccountTx(aliasHash: Buffer) {
    return this.synchronise(() => this.rollupDb.getAccountTx(aliasHash));
  }

  public async getLatestAccountTx(accountPubKey: Buffer) {
    return this.synchronise(() => this.rollupDb.getLatestAccountTx(accountPubKey));
  }

  public async getAccountTxCount() {
    return this.synchronise(() => this.rollupDb.getAccountTxCount());
  }

  public async getAccountCount() {
    return this.synchronise(() => this.rollupDb.getAccountCount());
  }

  public async getLatestAccountNonce(accountPubKey: GrumpkinAddress) {
    return this.synchronise(() => this.rollupDb.getLatestAccountNonce(accountPubKey));
  }

  public async getLatestAliasNonce(aliasHash: AliasHash) {
    return this.synchronise(() => this.rollupDb.getLatestAliasNonce(aliasHash));
  }

  public async getAccountId(aliasHash: AliasHash, nonce?: number) {
    return this.synchronise(() => this.rollupDb.getAccountId(aliasHash, nonce));
  }

  public async getTotalRollupsOfSize(rollupSize: number) {
    return this.synchronise(() => this.rollupDb.getTotalRollupsOfSize(rollupSize));
  }

  public async getUnsettledTxCount() {
    return this.synchronise(() => this.rollupDb.getUnsettledTxCount());
  }

  public async getUnsettledTxs() {
    return this.synchronise(() => this.rollupDb.getUnsettledTxs());
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

  public async getUnsettledNullifiers() {
    return this.synchronise(() => this.rollupDb.getUnsettledNullifiers());
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

  public async getRollups(take?: number, skip?: number, descending = false) {
    return this.synchronise(() => this.rollupDb.getRollups(take, skip, descending));
  }

  public async getRollupsByRollupIds(ids: number[]) {
    return this.synchronise(() => this.rollupDb.getRollupsByRollupIds(ids));
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

  public async confirmMined(
    id: number,
    gasUsed: number,
    gasPrice: bigint,
    mined: Date,
    ethTxHash: TxHash,
    interactionResult: DefiInteractionNote[],
    txIds: Buffer[],
    assetMetrics: AssetMetricsDao[],
  ) {
    return this.synchronise(() =>
      this.rollupDb.confirmMined(id, gasUsed, gasPrice, mined, ethTxHash, interactionResult, txIds, assetMetrics),
    );
  }

  public getSettledRollups(from = 0) {
    return this.synchronise(() => this.rollupDb.getSettledRollups(from));
  }

  public async getLastSettledRollup() {
    return this.synchronise(() => this.rollupDb.getLastSettledRollup());
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

  public async addClaim(claim: ClaimDao) {
    return this.synchronise(() => this.rollupDb.addClaim(claim));
  }

  public async getPendingClaims(take?: number) {
    return this.synchronise(() => this.rollupDb.getPendingClaims(take));
  }

  public async confirmClaimed(nullifier: Buffer, claimed: Date) {
    return this.synchronise(() => this.rollupDb.confirmClaimed(nullifier, claimed));
  }

  public async deleteUnsettledClaimTxs() {
    return this.synchronise(() => this.rollupDb.deleteUnsettledClaimTxs());
  }

  public async getAssetMetrics(assetId: number) {
    return this.synchronise(() => this.rollupDb.getAssetMetrics(assetId));
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

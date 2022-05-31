import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { TxHash } from '@aztec/barretenberg/blockchain';
import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { Mutex } from 'async-mutex';
import { AssetMetricsDao, AccountDao, ClaimDao, RollupDao, RollupProofDao, TxDao } from '../entity';
import { RollupDb } from './rollup_db';

export class SyncRollupDb {
  private writeMutex = new Mutex();

  constructor(private rollupDb: RollupDb) {}

  public async addTx(txDao: TxDao) {
    return this.synchronise(() => this.rollupDb.addTx(txDao));
  }

  public async addTxs(txs: TxDao[]) {
    return this.synchronise(() => this.rollupDb.addTxs(txs));
  }

  public async deleteTxsById(ids: Buffer[]) {
    return this.synchronise(() => this.rollupDb.deleteTxsById(ids));
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

  public async getAccountTxCount() {
    return this.synchronise(() => this.rollupDb.getAccountTxCount());
  }

  public async getAccountCount() {
    return this.synchronise(() => this.rollupDb.getAccountCount());
  }

  public async isAccountRegistered(accountPublicKey: GrumpkinAddress) {
    return this.synchronise(() => this.rollupDb.isAccountRegistered(accountPublicKey));
  }

  public async isAliasRegistered(aliasHash: AliasHash) {
    return this.synchronise(() => this.rollupDb.isAliasRegistered(aliasHash));
  }

  public async accountExists(accountPublicKey: GrumpkinAddress, aliasHash: AliasHash) {
    return this.synchronise(() => this.rollupDb.accountExists(accountPublicKey, aliasHash));
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

  public async getUnsettledPaymentTxs() {
    return this.synchronise(() => this.rollupDb.getUnsettledPaymentTxs());
  }

  public async getUnsettledAccounts() {
    return this.synchronise(() => this.rollupDb.getUnsettledAccounts());
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

  public async addRollupProofs(rollupDaos: RollupProofDao[]) {
    return this.synchronise(() => this.rollupDb.addRollupProofs(rollupDaos));
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

  public async setCallData(id: number, rollupProofCalldata: Buffer) {
    return this.synchronise(() => this.rollupDb.setCallData(id, rollupProofCalldata));
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
    subtreeRoot: Buffer,
  ) {
    return this.synchronise(() =>
      this.rollupDb.confirmMined(
        id,
        gasUsed,
        gasPrice,
        mined,
        ethTxHash,
        interactionResult,
        txIds,
        assetMetrics,
        subtreeRoot,
      ),
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

  public async getClaimsToRollup(take?: number) {
    return this.synchronise(() => this.rollupDb.getClaimsToRollup(take));
  }

  public async updateClaimsWithResultRollupId(interactionNonce: number, interactionResultRollupId: number) {
    return this.synchronise(() =>
      this.rollupDb.updateClaimsWithResultRollupId(interactionNonce, interactionResultRollupId),
    );
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

  public async eraseDb() {
    return this.synchronise(() => this.rollupDb.eraseDb());
  }
}

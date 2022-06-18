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

  public addTx(txDao: TxDao) {
    return this.synchronise(() => this.rollupDb.addTx(txDao));
  }

  public addTxs(txs: TxDao[]) {
    return this.synchronise(() => this.rollupDb.addTxs(txs));
  }

  public deleteTxsById(ids: Buffer[]) {
    return this.synchronise(() => this.rollupDb.deleteTxsById(ids));
  }

  public addAccounts(accounts: AccountDao[]) {
    return this.synchronise(() => this.rollupDb.addAccounts(accounts));
  }

  public getTx(txId: Buffer) {
    return this.synchronise(() => this.rollupDb.getTx(txId));
  }

  public getPendingTxCount() {
    return this.synchronise(() => this.rollupDb.getPendingTxCount());
  }

  public deletePendingTxs() {
    return this.synchronise(() => this.rollupDb.deletePendingTxs());
  }

  public getTotalTxCount() {
    return this.synchronise(() => this.rollupDb.getTotalTxCount());
  }

  public getJoinSplitTxCount() {
    return this.synchronise(() => this.rollupDb.getJoinSplitTxCount());
  }

  public getDefiTxCount() {
    return this.synchronise(() => this.rollupDb.getDefiTxCount());
  }

  public getAccountTxCount() {
    return this.synchronise(() => this.rollupDb.getAccountTxCount());
  }

  public getAccountCount() {
    return this.synchronise(() => this.rollupDb.getAccountCount());
  }

  public isAccountRegistered(accountPublicKey: GrumpkinAddress) {
    return this.synchronise(() => this.rollupDb.isAccountRegistered(accountPublicKey));
  }

  public isAliasRegistered(aliasHash: AliasHash) {
    return this.synchronise(() => this.rollupDb.isAliasRegistered(aliasHash));
  }

  public isAliasRegisteredToAccount(accountPublicKey: GrumpkinAddress, aliasHash: AliasHash) {
    return this.synchronise(() => this.rollupDb.isAliasRegisteredToAccount(accountPublicKey, aliasHash));
  }

  public getUnsettledTxCount() {
    return this.synchronise(() => this.rollupDb.getUnsettledTxCount());
  }

  public getUnsettledTxs() {
    return this.synchronise(() => this.rollupDb.getUnsettledTxs());
  }

  public getUnsettledDepositTxs() {
    return this.synchronise(() => this.rollupDb.getUnsettledDepositTxs());
  }

  public getUnsettledAccounts() {
    return this.synchronise(() => this.rollupDb.getUnsettledAccounts());
  }

  public getPendingTxs(take?: number) {
    return this.synchronise(() => this.rollupDb.getPendingTxs(take));
  }

  public getUnsettledNullifiers() {
    return this.synchronise(() => this.rollupDb.getUnsettledNullifiers());
  }

  public nullifiersExist(n1: Buffer, n2: Buffer) {
    return this.synchronise(() => this.rollupDb.nullifiersExist(n1, n2));
  }

  public addRollupProof(rollupDao: RollupProofDao) {
    return this.synchronise(() => this.rollupDb.addRollupProof(rollupDao));
  }

  public addRollupProofs(rollupDaos: RollupProofDao[]) {
    return this.synchronise(() => this.rollupDb.addRollupProofs(rollupDaos));
  }

  public getRollupProof(id: Buffer, includeTxs = false) {
    return this.synchronise(() => this.rollupDb.getRollupProof(id, includeTxs));
  }

  public deleteRollupProof(id: Buffer) {
    return this.synchronise(() => this.rollupDb.deleteRollupProof(id));
  }

  public deleteTxlessRollupProofs() {
    return this.synchronise(() => this.rollupDb.deleteTxlessRollupProofs());
  }

  public deleteOrphanedRollupProofs() {
    return this.synchronise(() => this.rollupDb.deleteOrphanedRollupProofs());
  }

  public getNextRollupId() {
    return this.synchronise(() => this.rollupDb.getNextRollupId());
  }

  public getRollup(id: number) {
    return this.synchronise(() => this.rollupDb.getRollup(id));
  }

  public getRollups(take?: number, skip?: number, descending = false) {
    return this.synchronise(() => this.rollupDb.getRollups(take, skip, descending));
  }

  public getRollupsByRollupIds(ids: number[]) {
    return this.synchronise(() => this.rollupDb.getRollupsByRollupIds(ids));
  }

  public getNumSettledRollups() {
    return this.synchronise(() => this.rollupDb.getNumSettledRollups());
  }

  public addRollup(rollup: RollupDao) {
    return this.synchronise(() => this.rollupDb.addRollup(rollup));
  }

  public setCallData(id: number, rollupProofCalldata: Buffer) {
    return this.synchronise(() => this.rollupDb.setCallData(id, rollupProofCalldata));
  }

  public confirmSent(id: number, txHash: TxHash) {
    return this.synchronise(() => this.rollupDb.confirmSent(id, txHash));
  }

  public confirmMined(
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

  public getSettledRollups(from = 0, take?: number) {
    return this.synchronise(() => this.rollupDb.getSettledRollups(from, take));
  }

  public getLastSettledRollup() {
    return this.synchronise(() => this.rollupDb.getLastSettledRollup());
  }

  public getUnsettledRollups() {
    return this.synchronise(() => this.rollupDb.getUnsettledRollups());
  }

  public deleteUnsettledRollups() {
    return this.synchronise(() => this.rollupDb.deleteUnsettledRollups());
  }

  public getRollupByDataRoot(dataRoot: Buffer) {
    return this.synchronise(() => this.rollupDb.getRollupByDataRoot(dataRoot));
  }

  public getDataRootsIndex(root: Buffer) {
    return this.synchronise(() => this.rollupDb.getDataRootsIndex(root));
  }

  public addClaim(claim: ClaimDao) {
    return this.synchronise(() => this.rollupDb.addClaim(claim));
  }

  public getClaimsToRollup(take?: number) {
    return this.synchronise(() => this.rollupDb.getClaimsToRollup(take));
  }

  public updateClaimsWithResultRollupId(interactionNonce: number, interactionResultRollupId: number) {
    return this.synchronise(() =>
      this.rollupDb.updateClaimsWithResultRollupId(interactionNonce, interactionResultRollupId),
    );
  }

  public confirmClaimed(nullifier: Buffer, claimed: Date) {
    return this.synchronise(() => this.rollupDb.confirmClaimed(nullifier, claimed));
  }

  public deleteUnsettledClaimTxs() {
    return this.synchronise(() => this.rollupDb.deleteUnsettledClaimTxs());
  }

  public getAssetMetrics(assetId: number) {
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

  public eraseDb() {
    return this.synchronise(() => this.rollupDb.eraseDb());
  }
}

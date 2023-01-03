import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { TxHash } from '@aztec/barretenberg/blockchain';
import { createDebugLogger } from '@aztec/barretenberg/log';
import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { Timer } from '@aztec/barretenberg/timer';
import {
  AssetMetricsDao,
  AccountDao,
  ClaimDao,
  RollupDao,
  RollupProofDao,
  TxDao,
  BridgeMetricsDao,
} from '../entity/index.js';
import { RollupDb } from './rollup_db.js';

export class LogRollupDb implements RollupDb {
  private debug: ReturnType<typeof createDebugLogger>;

  constructor(private rollupDb: RollupDb, debugName = 'log_rollup_db') {
    this.debug = createDebugLogger(debugName);
  }

  public init() {
    return this.time('init', () => this.rollupDb.init());
  }

  public destroy() {
    return this.time('destroy', () => this.rollupDb.destroy());
  }

  public addTx(txDao: TxDao) {
    return this.time('addTx', () => this.rollupDb.addTx(txDao));
  }

  public addTxs(txs: TxDao[]) {
    return this.time('addTxs', () => this.rollupDb.addTxs(txs));
  }

  public deleteTxsById(ids: Buffer[]) {
    return this.time('deleteTxsById', () => this.rollupDb.deleteTxsById(ids));
  }

  public addAccounts(accounts: AccountDao[]) {
    return this.time('addAccounts', () => this.rollupDb.addAccounts(accounts));
  }

  public getTx(txId: Buffer) {
    return this.time('getTx', () => this.rollupDb.getTx(txId));
  }

  public getPendingTxCount() {
    return this.time('getPendingTxCount', () => this.rollupDb.getPendingTxCount());
  }

  public getPendingSecondClassTxCount() {
    return this.time('getPendingSecondClassTxCount', () => this.rollupDb.getPendingSecondClassTxCount());
  }

  public deletePendingTxs() {
    return this.time('deletePendingTxs', () => this.rollupDb.deletePendingTxs());
  }

  public getTotalTxCount() {
    return this.time('getTotalTxCount', () => this.rollupDb.getTotalTxCount());
  }

  public getJoinSplitTxCount() {
    return this.time('getJoinSplitTxCount', () => this.rollupDb.getJoinSplitTxCount());
  }

  public getDefiTxCount() {
    return this.time('getDefiTxCount', () => this.rollupDb.getDefiTxCount());
  }

  public getAccountTxCount() {
    return this.time('getAccountTxCount', () => this.rollupDb.getAccountTxCount());
  }

  public getAccountCount() {
    return this.time('getAccountCount', () => this.rollupDb.getAccountCount());
  }

  public isAccountRegistered(accountPublicKey: GrumpkinAddress) {
    return this.time('isAccountRegistered', () => this.rollupDb.isAccountRegistered(accountPublicKey));
  }

  public isAliasRegistered(aliasHash: AliasHash) {
    return this.time('isAliasRegistered', () => this.rollupDb.isAliasRegistered(aliasHash));
  }

  public isAliasRegisteredToAccount(accountPublicKey: GrumpkinAddress, aliasHash: AliasHash) {
    return this.time('isAliasRegisteredToAccount', () =>
      this.rollupDb.isAliasRegisteredToAccount(accountPublicKey, aliasHash),
    );
  }

  public getUnsettledTxCount() {
    return this.time('getUnsettledTxCount', () => this.rollupDb.getUnsettledTxCount());
  }

  public getUnsettledTxs() {
    return this.time('getUnsettledTxs', () => this.rollupDb.getUnsettledTxs());
  }

  public getUnsettledDepositTxs() {
    return this.time('getUnsettledDepositTxs', () => this.rollupDb.getUnsettledDepositTxs());
  }

  public getPendingTxs(take?: number) {
    return this.time('getPendingTxs', () => this.rollupDb.getPendingTxs(take));
  }

  public getPendingSecondClassTxs(take?: number) {
    return this.time('getPendingSecondClassTxs', () => this.rollupDb.getPendingSecondClassTxs(take));
  }

  public getUnsettledNullifiers() {
    return this.time('getUnsettledNullifiers', () => this.rollupDb.getUnsettledNullifiers());
  }

  public nullifiersExist(nullifiers: Buffer[]) {
    return this.time('nullifiersExist', () => this.rollupDb.nullifiersExist(nullifiers));
  }

  public addRollupProof(rollupDao: RollupProofDao) {
    return this.time('addRollupProof', () => this.rollupDb.addRollupProof(rollupDao));
  }

  public addRollupProofs(rollupDaos: RollupProofDao[]) {
    return this.time('addRollupProofs', () => this.rollupDb.addRollupProofs(rollupDaos));
  }

  public getRollupProof(id: Buffer, includeTxs = false) {
    return this.time('getRollupProof', () => this.rollupDb.getRollupProof(id, includeTxs));
  }

  public deleteRollupProof(id: Buffer) {
    return this.time('deleteRollupProof', () => this.rollupDb.deleteRollupProof(id));
  }

  public deleteTxlessRollupProofs() {
    return this.time('deleteTxlessRollupProofs', () => this.rollupDb.deleteTxlessRollupProofs());
  }

  public deleteOrphanedRollupProofs() {
    return this.time('deleteOrphanedRollupProofs', () => this.rollupDb.deleteOrphanedRollupProofs());
  }

  public getNextRollupId() {
    return this.time('getNextRollupId', () => this.rollupDb.getNextRollupId());
  }

  public getRollup(id: number) {
    return this.time('getRollup', () => this.rollupDb.getRollup(id));
  }

  public getRollups(take?: number, skip?: number, descending = false) {
    return this.time('getRollups', () => this.rollupDb.getRollups(take, skip, descending));
  }

  public getRollupsByRollupIds(ids: number[]) {
    return this.time('getRollupsByRollupIds', () => this.rollupDb.getRollupsByRollupIds(ids));
  }

  public getSettledRollupsAfterTime(time: Date) {
    return this.time('getSettledRollupsAfterTime', () => this.rollupDb.getSettledRollupsAfterTime(time));
  }

  public getNumSettledRollups() {
    return this.time('getNumSettledRollups', () => this.rollupDb.getNumSettledRollups());
  }

  public addRollup(rollup: RollupDao) {
    return this.time('addRollup', () => this.rollupDb.addRollup(rollup));
  }

  public setCallData(id: number, rollupProofCalldata: Buffer) {
    return this.time('setCallData', () => this.rollupDb.setCallData(id, rollupProofCalldata));
  }

  public confirmSent(id: number, txHash: TxHash) {
    return this.time('confirmSent', () => this.rollupDb.confirmSent(id, txHash));
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
    bridgeMetrics: BridgeMetricsDao[],
    subtreeRoot: Buffer,
  ) {
    return this.time('confirmMined', () =>
      this.rollupDb.confirmMined(
        id,
        gasUsed,
        gasPrice,
        mined,
        ethTxHash,
        interactionResult,
        txIds,
        assetMetrics,
        bridgeMetrics,
        subtreeRoot,
      ),
    );
  }

  public getSettledRollups(from: number, take: number) {
    return this.time('getSettledRollups', () => this.rollupDb.getSettledRollups(from, take));
  }

  public getLastSettledRollup() {
    return this.time('getLastSettledRollup', () => this.rollupDb.getLastSettledRollup());
  }

  public getUnsettledRollups() {
    return this.time('getUnsettledRollups', () => this.rollupDb.getUnsettledRollups());
  }

  public deleteUnsettledRollups() {
    return this.time('deleteUnsettledRollups', () => this.rollupDb.deleteUnsettledRollups());
  }

  public getRollupByDataRoot(dataRoot: Buffer) {
    return this.time('getRollupByDataRoot', () => this.rollupDb.getRollupByDataRoot(dataRoot));
  }

  public getDataRootsIndex(root: Buffer) {
    return this.time('getDataRootsIndex', () => this.rollupDb.getDataRootsIndex(root));
  }

  public addClaims(claims: ClaimDao[]) {
    return this.time('addClaim', () => this.rollupDb.addClaims(claims));
  }

  public getClaimsToRollup(take?: number) {
    return this.time('getClaimsToRollup', () => this.rollupDb.getClaimsToRollup(take));
  }

  public updateClaimsWithResultRollupId(interactionNonces: number[], interactionResultRollupId: number) {
    return this.time('updateClaimsWithResultId', () =>
      this.rollupDb.updateClaimsWithResultRollupId(interactionNonces, interactionResultRollupId),
    );
  }

  public confirmClaimed(nullifiers: Buffer[], claimed: Date) {
    return this.time('confirmClaimed', () => this.rollupDb.confirmClaimed(nullifiers, claimed));
  }

  public deleteUnsettledClaimTxs() {
    return this.time('deleteUnsettledClaimTxs', () => this.rollupDb.deleteUnsettledClaimTxs());
  }

  public getAssetMetrics(assetId: number) {
    return this.time('getAssetMetrics', () => this.rollupDb.getAssetMetrics(assetId));
  }

  public addBridgeMetrics(bridgeMetrics: BridgeMetricsDao[]) {
    return this.time('addBridgeMetrics', () => this.rollupDb.addBridgeMetrics(bridgeMetrics));
  }

  public getBridgeMetricsForRollup(bridgeCallData: bigint, rollupId: number) {
    return this.time('getBridgeMetricsForRollup', () =>
      this.rollupDb.getBridgeMetricsForRollup(bridgeCallData, rollupId),
    );
  }

  public getOurLastBridgeMetrics(bridgeCallData: bigint) {
    return this.time('getOurLastBridgeMetrics', () => this.rollupDb.getOurLastBridgeMetrics(bridgeCallData));
  }

  public eraseDb() {
    return this.time('eraseDb', () => this.rollupDb.eraseDb());
  }

  private async time<T>(name: string, fn: () => Promise<T>) {
    const timer = new Timer();
    const result = await fn();
    this.debug(`${name}: ${timer.ms()}ms`);
    return result;
  }
}

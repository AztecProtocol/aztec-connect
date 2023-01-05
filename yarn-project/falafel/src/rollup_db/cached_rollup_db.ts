import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { TxHash, TxType } from '@aztec/barretenberg/blockchain';
import { createLogger } from '@aztec/barretenberg/log';
import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import {
  AssetMetricsDao,
  RollupDao,
  RollupProofDao,
  TxDao,
  BridgeMetricsDao,
  AccountDao,
  ClaimDao,
} from '../entity/index.js';
import { RollupDb } from './rollup_db.js';

export class CachedRollupDb implements RollupDb {
  private log = createLogger('CachedRollupDb');
  private refreshPromise?: Promise<void>;

  // The settled rollup cache is a sparse cache we can purge intermittently.
  private settledRollupCache: Promise<RollupDao>[] = [];

  // The following properties are updated by lazy refresh.
  private nextRollupId!: number;
  private totalTxCount!: number;
  private unsettledTxs!: TxDao[];
  private pendingSecondClassTxCount!: number;
  private unsettledNullifiers: Buffer[] = [];

  constructor(private underlying: RollupDb) {}

  public async init() {
    await this.underlying.init();
  }

  public async destroy() {
    await this.underlying.destroy();
  }

  private async refresh() {
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        const start = new Date().getTime();
        this.nextRollupId = await this.underlying.getNextRollupId();
        this.totalTxCount = await this.underlying.getTotalTxCount();
        this.unsettledTxs = await this.underlying.getUnsettledTxs();
        this.pendingSecondClassTxCount = await this.underlying.getPendingSecondClassTxCount();
        this.unsettledNullifiers = await this.underlying.getUnsettledNullifiers();
        this.log(`Refreshed db cache in ${new Date().getTime() - start}ms.`);
      })();
    }
    await this.refreshPromise;
  }

  // ------
  // The following functions are all related to the set of rollups.
  // Remove settled/unsettled distinction, remove redundent functions.
  // ------

  /**
   * Called by:
   * rollup_resolver (graphql. get rid of it!)
   * server, getRollupById (explorer support. get rid of it!)
   */
  public getRollup(id: number) {
    return this.underlying.getRollup(id);
  }

  /**
   * Called by:
   * rollup_resolver (graphql. get rid of it!)
   * server, getRollups (explorer support. get rid of it!)
   */
  public getRollups(take?: number, skip = 0, descending = false) {
    return this.underlying.getRollups(take, skip, descending);
  }

  /**
   * Called by:
   * world_state queryBridgeStats (cached, so per new client query per new rollup)
   */
  public getSettledRollupsAfterTime(time: Date) {
    return this.underlying.getSettledRollupsAfterTime(time);
  }

  /**
   * Called by:
   * get-blocks endpoint (client req)
   */
  public async getSettledRollups(from: number, take: number) {
    const numSettled = await this.getNumSettledRollups();
    const to = Math.min(from + take, numSettled);
    for (let i = from; i < to; ++i) {
      if (this.settledRollupCache[i] === undefined) {
        this.settledRollupCache[i] = this.underlying.getRollup(i) as Promise<RollupDao>;
      }
    }
    return await Promise.all(this.settledRollupCache.slice(from, to));
  }

  /**
   * Called by:
   * pipeline_coordinator.init (infrequent).
   */
  public getLastSettledRollup() {
    return this.underlying.getLastSettledRollup();
  }

  /**
   * Called by:
   * rollup_resolver (get rid of it!)
   * status endpoint (pull from world state?)
   */
  public async getNumSettledRollups() {
    await this.refresh();
    return this.nextRollupId;
  }

  /**
   * Called by:
   * metrics (infrequent).
   * rollup_aggregator (infrequent).
   * rollup_creator (infrequent).
   * status endpoint (client requent).
   * world_state.start (startup).
   */
  public async getNextRollupId() {
    await this.refresh();
    return this.nextRollupId;
  }

  public async getRollupsByRollupIds(ids: number[]) {
    return await this.underlying.getRollupsByRollupIds(ids);
  }

  public async getUnsettledRollups() {
    return await this.underlying.getUnsettledRollups();
  }

  public async getRollupByDataRoot(dataRoot: Buffer) {
    return await this.underlying.getRollupByDataRoot(dataRoot);
  }

  public async addRollupProof(rollupDao: RollupProofDao) {
    await this.underlying.addRollupProof(rollupDao);
    this.refreshPromise = undefined;
  }

  public async addRollupProofs(rollupDaos: RollupProofDao[]) {
    await this.underlying.addRollupProofs(rollupDaos);
    this.refreshPromise = undefined;
  }

  public async addRollup(rollup: RollupDao) {
    await this.underlying.addRollup(rollup);
    this.refreshPromise = undefined;
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
    bridgeMetrics: BridgeMetricsDao[],
    subtreeRoot: Buffer,
  ) {
    const rollup = await this.underlying.confirmMined(
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
    );
    this.refreshPromise = undefined;
    return rollup;
  }

  public async deleteUnsettledRollups() {
    await this.underlying.deleteUnsettledRollups();
  }

  // --------------------
  // Rollup Proofs
  // --------------------

  public async getRollupProof(id: Buffer, includeTxs = false) {
    return await this.underlying.getRollupProof(id, includeTxs);
  }

  public async deleteTxlessRollupProofs() {
    return await this.underlying.deleteTxlessRollupProofs();
  }

  public async deleteRollupProof(id: Buffer) {
    await this.underlying.deleteRollupProof(id);
    this.refreshPromise = undefined;
  }

  public async deleteOrphanedRollupProofs() {
    await this.underlying.deleteOrphanedRollupProofs();
    this.refreshPromise = undefined;
  }

  // --------------------
  // Transactions
  // --------------------

  /**
   * Called by:
   * metrics (infrequent)
   * pipeline_coordinator.start (infrequent)
   */
  public getPendingTxCount() {
    return this.underlying.getPendingTxCount();
  }

  /**
   * Called by:
   * status endpoint via world_state.tx_pool_profile (client request, needed?)
   */
  public async getPendingSecondClassTxCount() {
    await this.refresh();
    return this.pendingSecondClassTxCount;
  }

  /**
   * Called by:
   * metrics (infrequent)
   * status endpoint (client request)
   */
  public async getUnsettledTxCount() {
    await this.refresh();
    return this.unsettledTxs.length;
  }

  /**
   * Called by:
   * tx_receiver (on tx receipt)
   * get-pending-txs endpoint (client request, but just around some resetData call. urgh!)
   */
  public async getUnsettledTxs() {
    await this.refresh();
    return this.unsettledTxs;
  }

  /**
   * Called by:
   * tx_receiver (on tx receipt)
   * get-pending-deposit-txs endpoint (client request. urgh!)
   */
  public async getUnsettledDepositTxs() {
    await this.refresh();
    return this.unsettledTxs.filter(tx => tx.txType === TxType.DEPOSIT);
  }

  /**
   * Called by:
   * get-pending-note-nullifiers endpoint (client request. urgh!)
   */
  public async getUnsettledNullifiers() {
    await this.refresh();
    return this.unsettledNullifiers;
  }

  /**
   * tx_receiver (on tx receipt)
   */
  public async nullifiersExist(nullifiers: Buffer[]) {
    return await this.underlying.nullifiersExist(nullifiers);
  }

  /**
   * Called by:
   * status endpoint (to serve the explorer...)
   */
  public async getTotalTxCount() {
    await this.refresh();
    return this.totalTxCount;
  }

  public async addTx(txDao: TxDao) {
    await this.underlying.addTx(txDao);
    this.refreshPromise = undefined;
  }

  public async addTxs(txs: TxDao[]) {
    await this.underlying.addTxs(txs);
    this.refreshPromise = undefined;
  }

  public async deleteTxsById(ids: Buffer[]) {
    await this.underlying.deleteTxsById(ids);
    this.refreshPromise = undefined;
  }

  public async deletePendingTxs() {
    await this.underlying.deletePendingTxs();
    this.refreshPromise = undefined;
  }

  public async deleteUnsettledClaimTxs() {
    await this.underlying.deleteUnsettledClaimTxs();
    this.refreshPromise = undefined;
  }

  public async getTx(txId: Buffer) {
    return await this.underlying.getTx(txId);
  }

  public async getJoinSplitTxCount() {
    return await this.underlying.getJoinSplitTxCount();
  }

  public async getDefiTxCount() {
    return await this.underlying.getDefiTxCount();
  }

  public async getAccountTxCount() {
    return await this.underlying.getAccountTxCount();
  }

  public async getPendingTxs(take?: number) {
    return await this.underlying.getPendingTxs(take);
  }

  public async getPendingSecondClassTxs(take?: number) {
    return await this.underlying.getPendingSecondClassTxs(take);
  }

  public async addClaims(claims: ClaimDao[]) {
    return await this.underlying.addClaims(claims);
  }

  public async getClaimsToRollup(take?: number) {
    return await this.underlying.getClaimsToRollup(take);
  }

  public async updateClaimsWithResultRollupId(interactionNonces: number[], interactionResultRollupId: number) {
    return await this.underlying.updateClaimsWithResultRollupId(interactionNonces, interactionResultRollupId);
  }

  public async confirmClaimed(nullifiers: Buffer[], claimed: Date) {
    return await this.underlying.confirmClaimed(nullifiers, claimed);
  }

  // ------------
  // Accounts
  // ------------

  public async addAccounts(accounts: AccountDao[]) {
    await this.underlying.addAccounts(accounts);
  }

  public async getAccountCount() {
    return await this.underlying.getAccountCount();
  }

  public async isAliasRegistered(aliasHash: AliasHash) {
    return await this.underlying.isAliasRegistered(aliasHash);
  }

  public async isAliasRegisteredToAccount(accountPublicKey: GrumpkinAddress, aliasHash: AliasHash) {
    return await this.underlying.isAliasRegisteredToAccount(accountPublicKey, aliasHash);
  }

  public async isAccountRegistered(accountPublicKey: GrumpkinAddress) {
    return await this.underlying.isAccountRegistered(accountPublicKey);
  }

  // ------------
  // Miscellaneous
  // ------------

  public async setCallData(id: number, rollupProofCalldata: Buffer) {
    return await this.underlying.setCallData(id, rollupProofCalldata);
  }

  public async confirmSent(id: number, txHash: TxHash) {
    return await this.underlying.confirmSent(id, txHash);
  }

  public async getDataRootsIndex(root: Buffer) {
    return await this.underlying.getDataRootsIndex(root);
  }

  public async getAssetMetrics(assetId: number) {
    return await this.underlying.getAssetMetrics(assetId);
  }

  public async addBridgeMetrics(bridgeMetrics: BridgeMetricsDao[]) {
    return await this.underlying.addBridgeMetrics(bridgeMetrics);
  }

  public async getBridgeMetricsForRollup(bridgeCallData: bigint, rollupId: number) {
    return await this.underlying.getBridgeMetricsForRollup(bridgeCallData, rollupId);
  }

  public async getOurLastBridgeMetrics(bridgeCallData: bigint) {
    return await this.underlying.getOurLastBridgeMetrics(bridgeCallData);
  }

  public async eraseDb() {
    await this.underlying.eraseDb();
    this.refreshPromise = undefined;
  }
}

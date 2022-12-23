import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { TxHash, TxType } from '@aztec/barretenberg/blockchain';
import { ProofData } from '@aztec/barretenberg/client_proofs';
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
import { getNewAccountDaos } from './tx_dao_to_account_dao.js';

export class CachedRollupDb implements RollupDb {
  private pendingTxCount!: number;
  private totalTxCount!: number;
  private pendingSecondClassTxCount!: number;
  private rollups: RollupDao[] = [];
  private settledRollups: RollupDao[] = [];
  private unsettledTxs!: TxDao[];
  private settledNullifiers = new Set<bigint>();
  private unsettledNullifiers: Buffer[] = [];
  private log = createLogger('CachedRollupDb');

  constructor(private underlying: RollupDb) {}

  public async init() {
    await this.underlying.init();

    this.log('Loading rollup cache...');
    this.rollups = await this.underlying.getRollups();
    this.settledRollups = this.rollups.filter(rollup => rollup.mined);
    this.rollups
      .map(r => r.rollupProof.txs.map(tx => [tx.nullifier1, tx.nullifier2]).flat())
      .flat()
      .forEach(n => n && this.settledNullifiers.add(toBigIntBE(n)));
    this.log(`Loaded ${this.rollups.length} rollups and ${this.settledNullifiers.size} nullifiers from db...`);

    await this.refresh();
  }

  public async destroy() {
    await this.underlying.destroy();
  }

  private async refresh() {
    const start = new Date().getTime();
    this.totalTxCount = await this.underlying.getTotalTxCount();
    this.pendingTxCount = await this.underlying.getPendingTxCount();
    this.unsettledTxs = await this.underlying.getUnsettledTxs();
    this.pendingSecondClassTxCount = await this.underlying.getPendingSecondClassTxCount();
    this.unsettledNullifiers = await this.underlying.getUnsettledNullifiers();
    this.log(`Refreshed db cache in ${new Date().getTime() - start}ms.`);
  }

  public getPendingTxCount(includeSecondClass = false) {
    if (includeSecondClass) {
      return Promise.resolve(this.pendingTxCount + this.pendingSecondClassTxCount);
    } else {
      return Promise.resolve(this.pendingTxCount);
    }
  }

  public getPendingSecondClassTxCount() {
    return Promise.resolve(this.pendingSecondClassTxCount);
  }

  public getRollup(id: number) {
    return Promise.resolve(this.rollups[id]);
  }

  public getRollups(take?: number, skip = 0, descending = false) {
    const rollups = descending ? this.rollups.slice().reverse() : this.rollups;
    return Promise.resolve(rollups.slice(skip, take ? skip + take : undefined));
  }

  public getSettledRollupsAfterTime(time: Date, descending = false) {
    const rollups = this.settledRollups.filter(x => x.mined !== undefined && x.mined.getTime() >= time.getTime());
    return Promise.resolve(descending ? rollups.slice().reverse() : rollups);
  }

  public getNumSettledRollups() {
    return Promise.resolve(this.settledRollups.length);
  }

  public getUnsettledTxCount() {
    return Promise.resolve(this.unsettledTxs.length);
  }

  public getUnsettledTxs() {
    return Promise.resolve(this.unsettledTxs);
  }

  public getUnsettledDepositTxs() {
    return Promise.resolve(this.unsettledTxs.filter(tx => tx.txType === TxType.DEPOSIT));
  }

  public getUnsettledAccounts() {
    return Promise.resolve(getNewAccountDaos(this.unsettledTxs));
  }

  public getUnsettledNullifiers() {
    return Promise.resolve(this.unsettledNullifiers);
  }

  public nullifiersExist(n1: Buffer, n2: Buffer) {
    return Promise.resolve(
      this.settledNullifiers.has(toBigIntBE(n1)) ||
        this.settledNullifiers.has(toBigIntBE(n2)) ||
        this.unsettledNullifiers.findIndex(b => b.equals(n1) || b.equals(n2)) != -1,
    );
  }

  public getSettledRollups(from = 0, take?: number) {
    return Promise.resolve(this.settledRollups.slice(from, take ? from + take : undefined));
  }

  public getLastSettledRollup() {
    return Promise.resolve(
      this.settledRollups.length ? this.settledRollups[this.settledRollups.length - 1] : undefined,
    );
  }

  public getNextRollupId() {
    if (this.settledRollups.length === 0) {
      return Promise.resolve(0);
    }
    return Promise.resolve(this.settledRollups[this.settledRollups.length - 1].id + 1);
  }

  public getTotalTxCount() {
    return Promise.resolve(this.totalTxCount);
  }

  public async addTx(txDao: TxDao) {
    await this.underlying.addTx(txDao);

    const { nullifier1, nullifier2 } = new ProofData(txDao.proofData);
    [nullifier1, nullifier2].filter(n => !!toBigIntBE(n)).forEach(n => this.unsettledNullifiers.push(n));

    this.unsettledTxs.push(txDao);
    this.totalTxCount++;
    if (txDao.secondClass) {
      this.pendingSecondClassTxCount++;
    } else {
      this.pendingTxCount++;
    }
  }

  public async addTxs(txs: TxDao[]) {
    await this.underlying.addTxs(txs);

    txs
      .map(tx => new ProofData(tx.proofData))
      .map(p => [p.nullifier1, p.nullifier2])
      .flat()
      .filter(n => !!toBigIntBE(n))
      .forEach(n => this.unsettledNullifiers.push(n));

    this.unsettledTxs.push(...txs);
    this.totalTxCount += txs.length;
    this.pendingTxCount += txs.reduce((partialCount, tx) => (tx.secondClass ? partialCount : partialCount + 1), 0);
    this.pendingSecondClassTxCount += txs.reduce(
      (partialCount, tx) => (tx.secondClass ? partialCount + 1 : partialCount),
      0,
    );
  }

  public async deleteTxsById(ids: Buffer[]) {
    await this.underlying.deleteTxsById(ids);
    await this.refresh();
  }

  public async addRollupProof(rollupDao: RollupProofDao) {
    await this.underlying.addRollupProof(rollupDao);
    await this.refresh();
  }

  public async addRollupProofs(rollupDaos: RollupProofDao[]) {
    await this.underlying.addRollupProofs(rollupDaos);
    await this.refresh();
  }

  public async addRollup(rollup: RollupDao) {
    await this.underlying.addRollup(rollup);
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
    await this.underlying.deletePendingTxs();
    await this.refresh();
  }

  public async deleteRollupProof(id: Buffer) {
    await this.underlying.deleteRollupProof(id);
    await this.refresh();
  }

  public async deleteOrphanedRollupProofs() {
    await this.underlying.deleteOrphanedRollupProofs();
    await this.refresh();
  }

  public async deleteUnsettledRollups() {
    await this.underlying.deleteUnsettledRollups();
    this.rollups = this.settledRollups.slice();
  }

  public async deleteUnsettledClaimTxs() {
    await this.underlying.deleteUnsettledClaimTxs();
    await this.refresh();
  }

  public async eraseDb() {
    await this.underlying.eraseDb();
    await this.refresh();
  }

  public async addAccounts(accounts: AccountDao[]) {
    await this.underlying.addAccounts(accounts);
  }

  public async getTx(txId: Buffer) {
    return await this.underlying.getTx(txId);
  }

  public async isAccountRegistered(accountPublicKey: GrumpkinAddress) {
    return await this.underlying.isAccountRegistered(accountPublicKey);
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

  public async getAccountCount() {
    return await this.underlying.getAccountCount();
  }

  public async isAliasRegistered(aliasHash: AliasHash) {
    return await this.underlying.isAliasRegistered(aliasHash);
  }

  public async isAliasRegisteredToAccount(accountPublicKey: GrumpkinAddress, aliasHash: AliasHash) {
    return await this.underlying.isAliasRegisteredToAccount(accountPublicKey, aliasHash);
  }

  public async getPendingTxs(take?: number, includeSecondClass = false) {
    return await this.underlying.getPendingTxs(take, includeSecondClass);
  }

  public async getPendingSecondClassTxs(take?: number) {
    return await this.underlying.getPendingSecondClassTxs(take);
  }

  public async getRollupProof(id: Buffer, includeTxs = false) {
    return await this.underlying.getRollupProof(id, includeTxs);
  }

  public async deleteTxlessRollupProofs() {
    return await this.underlying.deleteTxlessRollupProofs();
  }

  public async getRollupsByRollupIds(ids: number[]) {
    return await this.underlying.getRollupsByRollupIds(ids);
  }

  public async setCallData(id: number, rollupProofCalldata: Buffer) {
    return await this.underlying.setCallData(id, rollupProofCalldata);
  }

  public async confirmSent(id: number, txHash: TxHash) {
    return await this.underlying.confirmSent(id, txHash);
  }

  public async getUnsettledRollups() {
    return await this.underlying.getUnsettledRollups();
  }

  public async getRollupByDataRoot(dataRoot: Buffer) {
    return await this.underlying.getRollupByDataRoot(dataRoot);
  }

  public async getDataRootsIndex(root: Buffer) {
    return await this.underlying.getDataRootsIndex(root);
  }

  public async addClaim(claim: ClaimDao) {
    return await this.underlying.addClaim(claim);
  }

  public async getClaimsToRollup(take?: number) {
    return await this.underlying.getClaimsToRollup(take);
  }

  public async updateClaimsWithResultRollupId(interactionNonce: number, interactionResultRollupId: number) {
    return await this.underlying.updateClaimsWithResultRollupId(interactionNonce, interactionResultRollupId);
  }

  public async confirmClaimed(nullifier: Buffer, claimed: Date) {
    return await this.underlying.confirmClaimed(nullifier, claimed);
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
}

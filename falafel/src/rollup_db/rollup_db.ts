import { AccountId, AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { TxType } from '@aztec/barretenberg/blockchain';
import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { WorldStateConstants } from '@aztec/barretenberg/world_state';
import { Connection, In, IsNull, LessThan, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { AccountDao } from '../entity/account';
import { AssetMetricsDao } from '../entity/asset_metrics';
import { ClaimDao } from '../entity/claim';
import { RollupDao } from '../entity/rollup';
import { RollupProofDao } from '../entity/rollup_proof';
import { TxDao } from '../entity/tx';
import { txDaoToAccountDao } from './tx_dao_to_account_dao';

export type RollupDb = {
  [P in keyof TypeOrmRollupDb]: TypeOrmRollupDb[P];
};

export class TypeOrmRollupDb implements RollupDb {
  private txRep: Repository<TxDao>;
  private rollupProofRep: Repository<RollupProofDao>;
  private rollupRep: Repository<RollupDao>;
  private accountRep: Repository<AccountDao>;
  private claimRep: Repository<ClaimDao>;
  private assetMetricsRep: Repository<AssetMetricsDao>;

  constructor(private connection: Connection, private initialDataRoot: Buffer = WorldStateConstants.EMPTY_DATA_ROOT) {
    this.txRep = this.connection.getRepository(TxDao);
    this.rollupProofRep = this.connection.getRepository(RollupProofDao);
    this.rollupRep = this.connection.getRepository(RollupDao);
    this.accountRep = this.connection.getRepository(AccountDao);
    this.claimRep = this.connection.getRepository(ClaimDao);
    this.assetMetricsRep = this.connection.getRepository(AssetMetricsDao);
  }

  public async addTx(txDao: TxDao) {
    await this.connection.transaction(async transactionalEntityManager => {
      if (txDao.txType === TxType.ACCOUNT) {
        await transactionalEntityManager.save(txDaoToAccountDao(txDao));
      }
      await transactionalEntityManager.save(txDao);
    });
  }

  public async addAccounts(accounts: AccountDao[]) {
    await this.connection.transaction(async transactionalEntityManager => {
      for (const account of accounts) {
        await transactionalEntityManager.save(account);
      }
    });
  }

  public async getTx(txId: Buffer) {
    return this.txRep.findOne({ id: txId }, { relations: ['rollupProof', 'rollupProof.rollup'] });
  }

  public async getPendingTxCount() {
    return this.txRep.count({
      where: { rollupProof: null },
    });
  }

  public async deletePendingTxs() {
    await this.connection.transaction(async transactionalEntityManager => {
      const pendingTxIds = (await this.txRep.find({ where: { rollupProof: null } })).map(tx => tx.id);
      await transactionalEntityManager.delete(this.accountRep.target, { txId: In(pendingTxIds) });
      await transactionalEntityManager.delete(this.txRep.target, { id: In(pendingTxIds) });
    });
  }

  public async getTotalTxCount() {
    return this.txRep.count();
  }

  public async getJoinSplitTxCount() {
    return this.txRep.count({ where: { txType: LessThan(TxType.ACCOUNT) } });
  }

  public async getDefiTxCount() {
    return this.txRep.count({ where: { txType: TxType.DEFI_DEPOSIT } });
  }

  public async getAccountTx(aliasHash: Buffer) {
    return this.accountRep.findOne({ aliasHash });
  }

  public async getLatestAccountTx(accountPubKey: Buffer) {
    return this.accountRep.findOne(
      { accountPubKey },
      {
        order: { nonce: 'DESC' },
      },
    );
  }

  public async getAccountTxCount() {
    return this.txRep.count({ where: { txType: TxType.ACCOUNT } });
  }

  public async getAccountCount() {
    return this.accountRep.count({ where: { nonce: 1 } });
  }

  public async getLatestAccountNonce(accountPubKey: GrumpkinAddress) {
    const account = await this.accountRep.findOne(
      { accountPubKey: accountPubKey.toBuffer() },
      { order: { nonce: 'DESC' } },
    );
    return account?.nonce || 0;
  }

  public async getLatestAliasNonce(aliasHash: AliasHash) {
    const account = await this.accountRep.findOne({ aliasHash: aliasHash.toBuffer() }, { order: { nonce: 'DESC' } });
    return account?.nonce || 0;
  }

  public async getAccountId(aliasHash: AliasHash, nonce?: number) {
    const account = await this.accountRep.findOne({
      where: { aliasHash: aliasHash.toBuffer(), nonce: MoreThanOrEqual(nonce || 0) },
      order: { nonce: nonce !== undefined ? 'ASC' : 'DESC' },
    });
    if (!account) {
      return;
    }
    return new AccountId(new GrumpkinAddress(account.accountPubKey), nonce === undefined ? account.nonce : nonce);
  }

  public async getTotalRollupsOfSize(rollupSize: number) {
    return await this.rollupProofRep
      .createQueryBuilder('rp')
      .leftJoin('rp.rollup', 'r')
      .where('rp.rollupSize = :rollupSize AND r.mined IS NOT NULL', { rollupSize })
      .getCount();
  }

  public async getUnsettledTxCount() {
    return await this.txRep.count({ where: { mined: null } });
  }

  public async getUnsettledTxs() {
    return await this.txRep.find({ where: { mined: null } });
  }

  public async getUnsettledJoinSplitTxs() {
    return await this.txRep.find({
      where: { txType: LessThan(TxType.ACCOUNT), mined: null },
    });
  }

  public async getUnsettledAccountTxs() {
    return await this.txRep.find({
      where: { txType: TxType.ACCOUNT, mined: null },
    });
  }

  public async getPendingTxs(take?: number) {
    return this.txRep.find({
      where: { rollupProof: null },
      order: { created: 'ASC' },
      take,
    });
  }

  public async getUnsettledNullifiers() {
    const unsettledTxs = await this.getUnsettledTxs();
    return unsettledTxs
      .map(tx => [tx.nullifier1, tx.nullifier2])
      .flat()
      .filter((n): n is Buffer => !!n);
  }

  public async nullifiersExist(n1: Buffer, n2: Buffer) {
    const count = await this.txRep
      .createQueryBuilder('tx')
      .where('tx.nullifier1 IS :n1 OR tx.nullifier1 IS :n2 OR tx.nullifier2 IS :n1 OR tx.nullifier2 IS :n2', { n1, n2 })
      .getCount();
    return count > 0;
  }

  public async addRollupProof(rollupDao: RollupProofDao) {
    await this.rollupProofRep.save(rollupDao);
  }

  public async getRollupProof(id: Buffer, includeTxs = false) {
    return this.rollupProofRep.findOne({ id }, { relations: includeTxs ? ['txs'] : undefined });
  }

  public async deleteRollupProof(id: Buffer) {
    await this.rollupProofRep.delete({ id });
  }

  /**
   * If a rollup proof is replaced by a larger aggregate, it will become "orphaned" from it's transactions.
   * This removes any rollup proofs that are no longer referenced by transactions.
   */
  public async deleteTxlessRollupProofs() {
    const orphaned = await this.rollupProofRep
      .createQueryBuilder('rollup_proof')
      .select('rollup_proof.id')
      .leftJoin('rollup_proof.txs', 'tx')
      .where('tx.rollupProof IS NULL')
      .getMany();
    await this.rollupProofRep.delete({ id: In(orphaned.map(rp => rp.id)) });
  }

  public async deleteOrphanedRollupProofs() {
    await this.rollupProofRep.delete({ rollup: IsNull() });
  }

  public async getRollupProofsBySize(numTxs: number) {
    return await this.rollupProofRep.find({
      where: { rollupSize: numTxs, rollup: null },
      relations: ['txs'],
      order: { dataStartIndex: 'ASC' },
    });
  }

  public async getNumRollupProofsBySize(numTxs: number) {
    return await this.rollupProofRep.count({
      where: { rollupSize: numTxs, rollup: null },
    });
  }

  public async getNumSettledRollups() {
    return await this.rollupRep.count({
      where: { mined: Not(IsNull()) },
    });
  }

  public async getNextRollupId() {
    const latestRollup = await this.rollupRep.findOne({ mined: Not(IsNull()) }, { order: { id: 'DESC' } });
    return latestRollup ? latestRollup.id + 1 : 0;
  }

  public async getRollup(id: number) {
    return this.rollupRep.findOne({ id }, { relations: ['rollupProof', 'rollupProof.txs', 'assetMetrics'] });
  }

  public async getAssetMetrics(assetId: number) {
    return await this.assetMetricsRep.findOne({ assetId }, { order: { rollupId: 'DESC' } });
  }

  public async getRollups(take?: number, skip?: number, descending = false) {
    const result = await this.rollupRep.find({
      order: { id: descending ? 'DESC' : 'ASC' },
      relations: ['rollupProof'],
      take,
      skip,
    });
    // Loading these as part of relations above leaks GB's of memory.
    // One would think the following would be much slower, but it's not actually that bad.
    for (const rollup of result) {
      rollup.rollupProof.txs = await this.txRep.find({ where: { rollupProof: rollup.rollupProof } });
    }
    return result;
  }

  public async getRollupsByRollupIds(ids: number[]) {
    return this.rollupRep.find({
      where: { id: In(ids) },
    });
  }

  public async addRollup(rollup: RollupDao) {
    // We need to erase any existing rollup first, to ensure we don't get a unique violation when inserting a
    // different rollup proof which has a one to one mapping with the rollup.
    await this.connection.transaction(async transactionalEntityManager => {
      for (const tx of rollup.rollupProof.txs) {
        await transactionalEntityManager.delete(this.txRep.target, { id: tx.id });
      }
      await transactionalEntityManager.delete(this.rollupRep.target, { id: rollup.id });
      await transactionalEntityManager.save(rollup);
      const accountDaos = rollup.rollupProof.txs.filter(tx => tx.txType === TxType.ACCOUNT).map(txDaoToAccountDao);
      await transactionalEntityManager.save(accountDaos);
    });
  }

  public async setCallData(id: number, callData: Buffer) {
    await this.rollupRep.update({ id }, { callData });
  }

  public async confirmSent(id: number, ethTxHash: TxHash) {
    await this.rollupRep.update({ id }, { ethTxHash } as Partial<RollupDao>);
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
    await this.connection.transaction(async transactionalEntityManager => {
      await transactionalEntityManager.update<TxDao>(this.txRep.target, { id: In(txIds) }, { mined });
      const dao: Partial<RollupDao> = {
        mined,
        gasUsed,
        gasPrice: toBufferBE(gasPrice, 32),
        ethTxHash,
        interactionResult: Buffer.concat(interactionResult.map(r => r.toBuffer())),
      };
      await transactionalEntityManager.update<RollupDao>(this.rollupRep.target, { id }, dao);
      await transactionalEntityManager.insert<AssetMetricsDao>(this.assetMetricsRep.target, assetMetrics);
    });
    return (await this.getRollup(id))!;
  }

  public async getSettledRollups(from = 0) {
    const rollups = await this.rollupRep.find({
      where: { id: MoreThanOrEqual(from), mined: Not(IsNull()) },
      order: { id: 'ASC' },
      relations: ['rollupProof'],
    });
    for (const rollup of rollups) {
      rollup.rollupProof.txs = await this.txRep.find({ where: { rollupProof: rollup.rollupProof } });
    }
    return rollups;
  }

  public async getLastSettledRollup() {
    return this.rollupRep.findOne(
      { mined: Not(IsNull()) },
      {
        order: { id: 'DESC' },
        relations: ['rollupProof'],
      },
    );
  }

  public async getUnsettledRollups() {
    return this.rollupRep.find({
      where: { mined: IsNull() },
      order: { id: 'ASC' },
    });
  }

  public async deleteUnsettledRollups() {
    await this.rollupRep.delete({ mined: IsNull() });
  }

  public async getRollupByDataRoot(dataRoot: Buffer) {
    return this.rollupRep.findOne({ dataRoot });
  }

  public async getDataRootsIndex(root: Buffer) {
    // Lookup and save the proofs data root index (for old root support).
    if (root.equals(this.initialDataRoot)) {
      return 0;
    }

    const rollup = await this.getRollupByDataRoot(root);
    if (!rollup) {
      throw new Error(`Rollup not found for merkle root: ${root.toString('hex')}`);
    }
    return rollup.id + 1;
  }

  public async addClaim(claim: ClaimDao) {
    await this.claimRep.save(claim);
  }

  public async getPendingClaims(take?: number) {
    return this.claimRep.find({
      where: { claimed: IsNull() },
      order: { created: 'ASC' },
      take,
    });
  }

  public async confirmClaimed(nullifier: Buffer, claimed: Date) {
    await this.claimRep.update({ nullifier }, { claimed });
  }

  public async deleteUnsettledClaimTxs() {
    const unsettledClaim = await this.claimRep.find({
      where: { claimed: IsNull() },
    });
    const nullifiers = unsettledClaim.map(c => c.nullifier);
    await this.txRep.delete({ nullifier1: In(nullifiers) });
  }
}

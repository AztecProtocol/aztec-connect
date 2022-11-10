import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { TxHash, TxType } from '@aztec/barretenberg/blockchain';
import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { serializeBufferArrayToVector } from '@aztec/barretenberg/serialize';
import { WorldStateConstants } from '@aztec/barretenberg/world_state';
import { DataSource, In, IsNull, LessThan, Between, MoreThanOrEqual, Not, Repository } from 'typeorm';
import {
  AccountDao,
  AssetMetricsDao,
  ClaimDao,
  RollupDao,
  RollupProofDao,
  TxDao,
  BridgeMetricsDao,
} from '../entity/index.js';
import { getNewAccountDaos } from './tx_dao_to_account_dao.js';

export type RollupDb = {
  [P in keyof TypeOrmRollupDb]: TypeOrmRollupDb[P];
};

function nullToUndefined<T>(input: T | null) {
  return input === null ? undefined : input;
}

export class TypeOrmRollupDb implements RollupDb {
  private txRep: Repository<TxDao>;
  private rollupProofRep: Repository<RollupProofDao>;
  private rollupRep: Repository<RollupDao>;
  private accountRep: Repository<AccountDao>;
  private claimRep: Repository<ClaimDao>;
  private assetMetricsRep: Repository<AssetMetricsDao>;
  private bridgeMetricsRep: Repository<BridgeMetricsDao>;

  constructor(private connection: DataSource, private initialDataRoot: Buffer = WorldStateConstants.EMPTY_DATA_ROOT) {
    this.txRep = this.connection.getRepository(TxDao);
    this.rollupProofRep = this.connection.getRepository(RollupProofDao);
    this.rollupRep = this.connection.getRepository(RollupDao);
    this.accountRep = this.connection.getRepository(AccountDao);
    this.claimRep = this.connection.getRepository(ClaimDao);
    this.assetMetricsRep = this.connection.getRepository(AssetMetricsDao);
    this.bridgeMetricsRep = this.connection.getRepository(BridgeMetricsDao);
  }

  public async addTx(txDao: TxDao) {
    await this.connection.transaction(async transactionalEntityManager => {
      await transactionalEntityManager.save(txDao);
      const [newAccountDao] = getNewAccountDaos([txDao]);
      if (newAccountDao) {
        await transactionalEntityManager.save(newAccountDao);
      }
    });
  }

  public async addTxs(txs: TxDao[]) {
    await this.connection.transaction(async transactionalEntityManager => {
      const accountDaos = getNewAccountDaos(txs);
      await transactionalEntityManager.save(accountDaos);
      await transactionalEntityManager.save(txs);
    });
  }

  public async deleteTxsById(ids: Buffer[]) {
    await this.txRep.delete({ id: In(ids) });
  }

  public async addAccounts(accounts: AccountDao[]) {
    await this.connection.transaction(async transactionalEntityManager => {
      for (const account of accounts) {
        await transactionalEntityManager.save(account);
      }
    });
  }

  public async getTx(txId: Buffer) {
    return nullToUndefined(
      await this.txRep.findOne({ where: { id: txId }, relations: ['rollupProof', 'rollupProof.rollup'] }),
    );
  }

  public async getPendingTxCount() {
    return await this.txRep.count({
      where: { rollupProof: IsNull() },
    });
  }

  public async deletePendingTxs() {
    await this.txRep.delete({ rollupProof: IsNull() });
  }

  public async getTotalTxCount() {
    return await this.txRep.count();
  }

  public async getJoinSplitTxCount() {
    return await this.txRep.count({ where: { txType: LessThan(TxType.ACCOUNT) } });
  }

  public async getDefiTxCount() {
    return await this.txRep.count({ where: { txType: TxType.DEFI_DEPOSIT } });
  }

  public async getAccountTxCount() {
    return await this.txRep.count({ where: { txType: TxType.ACCOUNT } });
  }

  public async getAccountCount() {
    return await this.accountRep.count();
  }

  public async isAccountRegistered(accountPublicKey: GrumpkinAddress) {
    const account = await this.accountRep.findOne({ where: { accountPublicKey: accountPublicKey.toBuffer() } });
    return !!account;
  }

  public async isAliasRegistered(aliasHash: AliasHash) {
    const account = await this.accountRep.findOne({ where: { aliasHash: aliasHash.toBuffer() } });
    return !!account;
  }

  public async isAliasRegisteredToAccount(accountPublicKey: GrumpkinAddress, aliasHash: AliasHash) {
    const account = await this.accountRep.findOne({
      where: { accountPublicKey: accountPublicKey.toBuffer(), aliasHash: aliasHash.toBuffer() },
    });
    return !!account;
  }

  public async getUnsettledTxCount() {
    return await this.txRep.count({ where: { mined: IsNull() } });
  }

  public async getUnsettledTxs() {
    return await this.txRep.find({ where: { mined: IsNull() } });
  }

  public async getUnsettledDepositTxs() {
    return await this.txRep.find({
      where: { txType: TxType.DEPOSIT, mined: IsNull() },
    });
  }

  public async getUnsettledAccounts() {
    const unsettledAccountTxs = await this.txRep.find({
      where: { txType: TxType.ACCOUNT, mined: IsNull() },
      order: { created: 'DESC' },
    });
    return getNewAccountDaos(unsettledAccountTxs);
  }

  public async getPendingTxs(take?: number) {
    return await this.txRep.find({
      where: { rollupProof: IsNull() },
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

  public async addRollupProofs(rollupDaos: RollupProofDao[]) {
    for (const dao of rollupDaos) {
      await this.rollupProofRep.save(dao);
    }
  }

  public async getRollupProof(id: Buffer, includeTxs = false) {
    return nullToUndefined(
      await this.rollupProofRep.findOne({ where: { id }, relations: includeTxs ? ['txs'] : undefined }),
    );
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

  public async getNumSettledRollups() {
    return await this.rollupRep.count({
      where: { mined: Not(IsNull()) },
    });
  }

  public async getNextRollupId() {
    const latestRollup = await this.rollupRep.findOne({ where: { mined: Not(IsNull()) }, order: { id: 'DESC' } });
    return latestRollup ? latestRollup.id + 1 : 0;
  }

  public async getRollup(id: number) {
    return nullToUndefined(
      await this.rollupRep.findOne({
        where: { id },
        relations: ['rollupProof', 'rollupProof.txs', 'assetMetrics', 'bridgeMetrics'],
      }),
    );
  }

  public async getAssetMetrics(assetId: number) {
    return nullToUndefined(await this.assetMetricsRep.findOne({ where: { assetId }, order: { rollupId: 'DESC' } }));
  }

  public async getBridgeMetricsForRollup(bridgeCallData: bigint, rollupId: number) {
    // TODO: rename bridgeId to bridgeCallData
    return await this.bridgeMetricsRep.findOne({ where: { bridgeId: bridgeCallData, rollupId } });
  }

  public async getOurLastBridgeMetrics(bridgeCallData: bigint) {
    // TODO: rename bridgeId to bridgeCallData
    return await this.bridgeMetricsRep.findOne({
      where: { bridgeId: bridgeCallData, publishedByProvider: true },
      order: { rollupId: 'DESC' },
    });
  }

  public async addBridgeMetrics(bridgeMetrics: BridgeMetricsDao[]) {
    await this.connection.transaction(async transactionalEntityManager => {
      await transactionalEntityManager.save<BridgeMetricsDao>(bridgeMetrics);
    });
  }

  /**
   * Warning: rollups[i].rollupProof.txs must be ordered as they exist within the proof.
   * The rollupProof entity enforces this after load, but we're sidestepping it here due to join memory issues.
   * Do not populate the tx array manually, without enforcing this order.
   */
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
      rollup.rollupProof.txs = await this.txRep.find({ where: { rollupProof: { id: rollup.rollupProof.id } } });
      // Enforce tx ordering.
      rollup.rollupProof.afterLoad();
    }
    return result;
  }

  public async getSettledRollupsAfterTime(time: Date, descending = false) {
    let end = (await this.getNextRollupId()) - 1;
    let foundRollups: RollupDao[] = [];
    while (end >= 0) {
      const start = Math.max(end - 1000, 0);
      const rollups = await this.rollupRep.find({
        where: [{ mined: Not(IsNull()), id: Between(start, end) }],
        order: { id: descending ? 'DESC' : 'ASC' },
        relations: ['rollupProof'],
      });
      foundRollups = [...rollups, ...foundRollups];
      end = start - 1;
      if (foundRollups.length) {
        const earliestRollup = foundRollups[0];
        if (earliestRollup.mined!.getTime() < time.getTime()) {
          break;
        }
      }
    }

    foundRollups = foundRollups.filter(x => x.mined!.getTime() >= time.getTime());

    // Loading these as part of relations above leaks GB's of memory.
    // One would think the following would be much slower, but it's not actually that bad.
    for (const rollup of foundRollups) {
      rollup.rollupProof.txs = await this.txRep.find({ where: { rollupProof: { id: rollup.rollupProof.id } } });
      // Enforce tx ordering.
      rollup.rollupProof.afterLoad();
    }
    return foundRollups;
  }

  /**
   * Warning: rollups[i].rollupProof.txs must be ordered as they exist within the proof.
   * The rollupProof entity enforces this after load, but we're sidestepping it here due to join memory issues.
   * Do not populate the tx array manually, without enforcing this order.
   */
  public async getSettledRollups(from = 0, take?: number) {
    const rollups = await this.rollupRep.find({
      where: { id: MoreThanOrEqual(from), mined: Not(IsNull()) },
      order: { id: 'ASC' },
      relations: ['rollupProof'],
      take,
    });
    // Loading these as part of relations above leaks GB's of memory.
    // One would think the following would be much slower, but it's not actually that bad.
    for (const rollup of rollups) {
      rollup.rollupProof.txs = await this.txRep.find({ where: { rollupProof: { id: rollup.rollupProof.id } } });
      // Enforce tx ordering.
      rollup.rollupProof.afterLoad();
    }
    return rollups;
  }

  public async getRollupsByRollupIds(ids: number[]) {
    return await this.rollupRep.find({
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
      const accountDaos = getNewAccountDaos(rollup.rollupProof.txs);
      await transactionalEntityManager.save(accountDaos);
    });
  }

  public async setCallData(id: number, processRollupCalldata: Buffer) {
    await this.rollupRep.update({ id }, { processRollupCalldata });
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
    bridgeMetrics: BridgeMetricsDao[],
    subtreeRoot: Buffer,
  ) {
    await this.connection.transaction(async transactionalEntityManager => {
      await transactionalEntityManager.update<TxDao>(this.txRep.target, { id: In(txIds) }, { mined });
      const dao: Partial<RollupDao> = {
        mined,
        gasUsed,
        gasPrice: toBufferBE(gasPrice, 32),
        ethTxHash,
        interactionResult: serializeBufferArrayToVector(interactionResult.map(r => r.toBuffer())),
        subtreeRoot,
      };
      await transactionalEntityManager.update<RollupDao>(this.rollupRep.target, { id }, dao);
      await transactionalEntityManager.insert<AssetMetricsDao>(this.assetMetricsRep.target, assetMetrics);
      await transactionalEntityManager.save<BridgeMetricsDao>(bridgeMetrics);
    });
    return (await this.getRollup(id))!;
  }

  public async getLastSettledRollup() {
    return nullToUndefined(
      await this.rollupRep.findOne({
        where: { mined: Not(IsNull()) },
        order: { id: 'DESC' },
        relations: ['rollupProof'],
      }),
    );
  }

  public async getUnsettledRollups() {
    return await this.rollupRep.find({
      where: { mined: IsNull() },
      order: { id: 'ASC' },
    });
  }

  public async deleteUnsettledRollups() {
    await this.rollupRep.delete({ mined: IsNull() });
  }

  public async getRollupByDataRoot(dataRoot: Buffer) {
    return nullToUndefined(await this.rollupRep.findOne({ where: { dataRoot } }));
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

  public async getClaimsToRollup(take?: number) {
    return await this.claimRep.find({
      where: { claimed: IsNull(), interactionResultRollupId: Not(IsNull()) },
      order: { created: 'ASC' },
      take,
    });
  }

  public async updateClaimsWithResultRollupId(interactionNonce: number, interactionResultRollupId: number) {
    await this.claimRep.update({ interactionNonce }, { interactionResultRollupId });
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

  public async eraseDb() {
    await this.connection.transaction(async transactionalEntityManager => {
      await transactionalEntityManager.delete(this.accountRep.target, {});
      await transactionalEntityManager.delete(this.assetMetricsRep.target, {});
      await transactionalEntityManager.delete(this.claimRep.target, {});
      await transactionalEntityManager.delete(this.rollupRep.target, {});
      await transactionalEntityManager.delete(this.rollupProofRep.target, {});
      await transactionalEntityManager.delete(this.txRep.target, {});
    });
  }
}

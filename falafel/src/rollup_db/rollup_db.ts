import { EthAddress } from 'barretenberg/address';
import { AccountAliasId } from 'barretenberg/client_proofs/account_alias_id';
import { JoinSplitProofData, ProofData } from 'barretenberg/client_proofs/proof_data';
import { InnerProofData } from 'barretenberg/rollup_proof';
import { TxHash } from 'barretenberg/tx_hash';
import { toBufferBE } from 'bigint-buffer';
import { Connection, In, IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { AccountTxDao } from '../entity/account_tx';
import { JoinSplitTxDao } from '../entity/join_split_tx';
import { RollupDao } from '../entity/rollup';
import { RollupProofDao } from '../entity/rollup_proof';
import { TxDao } from '../entity/tx';

export type RollupDb = {
  [P in keyof TypeOrmRollupDb]: TypeOrmRollupDb[P];
};

export class TypeOrmRollupDb implements RollupDb {
  private txRep: Repository<TxDao>;
  private joinSplitTxRep: Repository<JoinSplitTxDao>;
  private accountTxRep: Repository<AccountTxDao>;
  private rollupProofRep: Repository<RollupProofDao>;
  private rollupRep: Repository<RollupDao>;

  constructor(private connection: Connection) {
    this.txRep = this.connection.getRepository(TxDao);
    this.joinSplitTxRep = this.connection.getRepository(JoinSplitTxDao);
    this.accountTxRep = this.connection.getRepository(AccountTxDao);
    this.rollupProofRep = this.connection.getRepository(RollupProofDao);
    this.rollupRep = this.connection.getRepository(RollupDao);
  }

  public async addTx(txDao: TxDao) {
    await this.connection.transaction(async transactionalEntityManager => {
      await transactionalEntityManager.save(txDao);

      const proofData = InnerProofData.fromBuffer(txDao.proofData);

      if (proofData.proofId === 0) {
        const jsProofData = new JoinSplitProofData(new ProofData(txDao.proofData));
        const joinSplitDao = new JoinSplitTxDao({
          id: proofData.txId,
          publicInput: jsProofData.publicInput,
          publicOutput: jsProofData.publicOutput,
          assetId: jsProofData.assetId,
          inputOwner: jsProofData.inputOwner,
          outputOwner: jsProofData.outputOwner,
          created: txDao.created,
        });
        await transactionalEntityManager.save(joinSplitDao);
      } else if (proofData.proofId === 1) {
        const accountAliasId = AccountAliasId.fromBuffer(proofData.assetId);
        const accountTxDao = new AccountTxDao({
          id: proofData.txId,
          accountPubKey: Buffer.concat([proofData.publicInput, proofData.publicOutput]),
          aliasHash: accountAliasId.aliasHash.toBuffer(),
          nonce: accountAliasId.nonce,
          spendingKey1: proofData.nullifier1,
          spendingKey2: proofData.nullifier2,
          created: txDao.created,
        });
        await transactionalEntityManager.save(accountTxDao);
      }
    });
  }

  public async getTx(txId: Buffer) {
    return this.txRep.findOne({ id: txId }, { relations: ['rollupProof'] });
  }

  public async getTxsByTxIds(txIds: Buffer[]) {
    return this.txRep.find({
      where: { txId: In(txIds) },
      relations: ['rollupProof', 'rollupProof.rollup'],
    });
  }

  public async getLatestTxs(take: number) {
    return this.txRep.find({
      order: { created: 'DESC' },
      relations: ['rollupProof', 'rollupProof.rollup'],
      take,
    });
  }

  public async getPendingTxCount() {
    return this.txRep.count({
      where: { rollupProof: null },
    });
  }

  public async deletePendingTxs() {
    await this.txRep.delete({ rollupProof: null });
  }

  public async getTotalTxCount() {
    return this.txRep.count();
  }

  public async getJoinSplitTxCount() {
    return this.joinSplitTxRep.count();
  }

  public async getAccountTxCount() {
    return this.accountTxRep.count();
  }

  public async getRegistrationTxCount() {
    const result = await this.accountTxRep.query(
      `select count(distinct(accountPubKey)) as count from account_tx where nonce=1`,
    );
    return result[0] ? result[0].count : 0;
  }

  public async getTotalRollupsOfSize(rollupSize: number) {
    return await this.rollupProofRep
      .createQueryBuilder('rp')
      .leftJoin('rp.rollup', 'r')
      .where('rp.rollupSize = :rollupSize AND r.mined IS NOT NULL', { rollupSize })
      .getCount();
  }

  public async getUnsettledTxCount() {
    return await this.txRep
      .createQueryBuilder('tx')
      .leftJoin('tx.rollupProof', 'rp')
      .leftJoin('rp.rollup', 'r')
      .where('tx.rollupProof IS NULL OR rp.rollup IS NULL OR r.mined IS NULL')
      .getCount();
  }

  public async getUnsettledJoinSplitTxsForInputAddress(inputOwner: EthAddress) {
    return await this.joinSplitTxRep
      .createQueryBuilder('js_tx')
      .leftJoin('js_tx.internalId', 'tx')
      .leftJoin('tx.rollupProof', 'rp')
      .leftJoin('rp.rollup', 'r')
      .where('js_tx.inputOwner = :owner AND (tx.rollupProof IS NULL OR rp.rollup IS NULL OR r.mined IS NULL)', {
        owner: inputOwner.toBuffer(),
      })
      .getMany();
  }

  public async getPendingTxs(take?: number) {
    return this.txRep.find({
      where: { rollupProof: null },
      order: { created: 'ASC' },
      take,
    });
  }

  public async getPendingNoteNullifiers() {
    const unsettledTxs = await this.getPendingTxs();
    return unsettledTxs.map(tx => [tx.nullifier1, tx.nullifier2]).flat();
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
    return this.rollupRep.findOne({ id }, { relations: ['rollupProof', 'rollupProof.txs'] });
  }

  public async getRollups(take: number, skip?: number) {
    return this.rollupRep.find({
      order: { id: 'DESC' },
      relations: ['rollupProof', 'rollupProof.txs'],
      take,
      skip,
    });
  }

  public async addRollup(rollup: RollupDao) {
    return await this.rollupRep.save(rollup);
  }

  public async setCallData(id: number, callData: Buffer) {
    await this.rollupRep.update({ id }, { callData });
  }

  public async confirmSent(id: number, txHash: TxHash) {
    await this.rollupRep.update({ id }, { ethTxHash: txHash.toBuffer() });
  }

  public async confirmMined(id: number, gasUsed: number, gasPrice: bigint, mined: Date, ethTxHash: TxHash) {
    await this.rollupRep.update(
      { id },
      { mined, gasUsed, gasPrice: toBufferBE(gasPrice, 32), ethTxHash: ethTxHash.toBuffer() },
    );
  }

  public getSettledRollups(from = 0, descending = false, take?: number) {
    return this.rollupRep.find({
      where: { id: MoreThanOrEqual(from), mined: Not(IsNull()) },
      order: { id: descending ? 'DESC' : 'ASC' },
      relations: ['rollupProof'],
      take,
    });
  }

  public getUnsettledRollups() {
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
    const emptyDataRoot = Buffer.from('2708a627d38d74d478f645ec3b4e91afa325331acf1acebe9077891146b75e39', 'hex');
    if (root.equals(emptyDataRoot)) {
      return 0;
    }

    const rollup = await this.getRollupByDataRoot(root);
    if (!rollup) {
      throw new Error(`Rollup not found for merkle root: ${root.toString('hex')}`);
    }
    return rollup.id + 1;
  }
}

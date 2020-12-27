import { TxHash } from 'barretenberg/rollup_provider';
import { Connection, In, IsNull, MoreThanOrEqual, Repository } from 'typeorm';
import { RollupDao } from '../entity/rollup';
import { RollupProofDao } from '../entity/rollup_proof';
import { TxDao } from '../entity/tx';

export class RollupDb {
  private txRep: Repository<TxDao>;
  private rollupProofRep: Repository<RollupProofDao>;
  private rollupRep: Repository<RollupDao>;

  constructor(private connection: Connection) {
    this.txRep = this.connection.getRepository(TxDao);
    this.rollupProofRep = this.connection.getRepository(RollupProofDao);
    this.rollupRep = this.connection.getRepository(RollupDao);
  }

  public async addTx(txDao: TxDao) {
    return this.txRep.save(txDao);
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

  public async getPendingTxs(take?: number) {
    return this.txRep.find({
      where: { rollupProof: null },
      order: { created: 'ASC' },
      take,
    });
  }

  public async addRollupProof(rollupDao: RollupProofDao) {
    await this.rollupProofRep.save(rollupDao);
  }

  public async getRollupProof(id: Buffer, includeTxs = false) {
    return this.rollupProofRep.findOne({ id }, { relations: includeTxs ? ['txs'] : undefined });
  }

  public async deleteRollupProof(id: Buffer) {
    return this.rollupProofRep.delete({ id });
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
    // return await this.rollupProofRep
    //   .createQueryBuilder('rollup_proof')
    //   .innerJoin('rollup_proof.txs', 'tx')
    //   .where('rollup_proof.rollup IS NULL')
    //   .groupBy('tx.rollupProof')
    //   .having('COUNT(tx.id) = :numTxs', { numTxs })
    //   .getMany();
    return await this.rollupProofRep.find({
      where: { rollupSize: numTxs, rollup: null },
      relations: ['txs'],
      order: { dataStartIndex: 'ASC' },
    });
  }

  public async getNextRollupId() {
    const latestRollup = await this.rollupRep.findOne({ mined: true }, { order: { id: 'DESC' } });
    return latestRollup ? latestRollup.id + 1 : 0;
  }

  public async getRollup(id: number) {
    return this.rollupRep.findOne({ id }, { relations: ['rollupProof', 'rollupProof.txs'] });
  }

  public async getRollups(take: number) {
    return this.rollupRep.find({
      order: { id: 'DESC' },
      relations: ['rollupProof', 'rollupProof.txs'],
      take,
    });
  }

  public async addRollup(rollup: RollupDao) {
    return await this.rollupRep.save(rollup);
  }

  public async confirmSent(id: number, txHash: TxHash) {
    await this.rollupRep.update({ id }, { ethTxHash: txHash.toBuffer() });
  }

  public async confirmMined(id: number) {
    await this.rollupRep.update({ id }, { mined: true });
  }

  public getSettledRollups(from = 0, descending = false, take?: number) {
    return this.rollupRep.find({
      where: { id: MoreThanOrEqual(from), mined: true },
      order: { id: descending ? 'DESC' : 'ASC' },
      relations: ['rollupProof'],
      take,
    });
  }

  public getUnsettledRollups() {
    return this.rollupRep.find({
      where: { mined: false },
      order: { id: 'ASC' },
    });
  }

  public async deleteUnsettledRollups() {
    await this.rollupRep.delete({ mined: false });
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

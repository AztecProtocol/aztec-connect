import { InnerProofData } from 'barretenberg/rollup_proof';
import { Connection, In, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { RollupDao } from '../entity/rollup';
import { TxDao } from '../entity/tx';
import { Rollup } from '../rollup';

export class RollupDb {
  public rollupTxRep: Repository<TxDao>;
  private rollupRep: Repository<RollupDao>;

  constructor(private connection: Connection) {
    this.rollupTxRep = this.connection.getRepository(TxDao);
    this.rollupRep = this.connection.getRepository(RollupDao);
  }

  public async addTx(txDao: TxDao) {
    return this.rollupTxRep.save(txDao);
  }

  public async addRollup(rollup: Rollup, viewingKeys: Buffer[] = []) {
    const rollupDao = new RollupDao();

    const txIds = rollup.proofs.map(txBuf => InnerProofData.fromBuffer(txBuf).txId);
    const txs = await this.rollupTxRep.find({ where: { txId: In(txIds) } });
    if (txs.length !== txIds.length) {
      throw new Error('Missing txs.');
    }

    rollupDao.hash = rollup.rollupHash;
    rollupDao.created = new Date();
    rollupDao.id = rollup.rollupId;
    rollupDao.dataRoot = rollup.newDataRoot;
    rollupDao.txs = txs;
    rollupDao.status = 'CREATING';
    rollupDao.viewingKeys = Buffer.concat(viewingKeys);
    return this.rollupRep.save(rollupDao);
  }

  public async addRollupDao(rollupDao: RollupDao) {
    await this.rollupRep.save(rollupDao);
  }

  public async setRollupProof(rollupId: number, proofData: Buffer) {
    const rollupDao = await this.getRollupFromId(rollupId);
    if (!rollupDao) {
      throw new Error(`Rollup not found: ${rollupId}`);
    }

    rollupDao.proofData = proofData;
    await this.rollupRep.save(rollupDao);
  }

  public async confirmRollupCreated(rollupId: number) {
    const rollupDao = await this.getRollupFromId(rollupId);
    if (!rollupDao) {
      throw new Error(`Rollup not found: ${rollupId}`);
    }

    rollupDao.status = 'CREATED';
    await this.rollupRep.save(rollupDao);
  }

  public async confirmSent(rollupId: number, ethTxHash: Buffer) {
    const rollupDao = await this.getRollupFromId(rollupId);
    if (!rollupDao) {
      throw new Error(`Rollup not found: ${rollupId}`);
    }

    if (rollupDao.status === 'SETTLED') {
      // When using local blockchain, the block gets resolved and confirmRollup is triggered before we call confirmSent.
      return;
    }

    rollupDao.status = 'PUBLISHED';
    rollupDao.ethTxHash = ethTxHash;
    await this.rollupRep.save(rollupDao);
  }

  public async confirmRollup(rollupId: number) {
    let rollup = await this.rollupRep.findOne(rollupId);

    if (!rollup) {
      rollup = new RollupDao();
      rollup.created = new Date();
      rollup.id = rollupId;
      rollup.status = 'SETTLED';
    } else {
      rollup.status = 'SETTLED';
    }
    await this.rollupRep.save(rollup);
  }

  public async deleteRollup(rollupId: number) {
    await this.rollupRep.delete(rollupId);
  }

  public async deletePendingRollups() {
    await this.rollupRep.delete({ status: 'CREATING' });
  }

  public async deleteUnsettledRollups() {
    await this.rollupRep.delete({ status: Not('SETTLED') });
  }

  public getPendingRollups() {
    return this.rollupRep.find({
      where: { status: 'CREATING' },
      order: { id: 'ASC' },
    });
  }

  public getCreatedRollups() {
    return this.rollupRep.find({
      where: { status: 'CREATED' },
      relations: ['txs'],
      order: { id: 'ASC' },
    });
  }

  public getUnsettledRollups() {
    return this.rollupRep.find({
      where: { status: Not('SETTLED') },
      order: { id: 'ASC' },
    });
  }

  public getUnsettledTxs() {
    return this.rollupTxRep
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.rollup', 'rollup')
      .where('tx.rollup IS NULL')
      .orWhere('rollup.status != :rollupStatus', { rollupStatus: 'SETTLED' })
      .getMany();
  }

  public async getTxByTxId(txId: Buffer) {
    return this.rollupTxRep.findOne({ txId }, { relations: ['rollup'] });
  }

  public async getTxsByTxIds(txIds: Buffer[]) {
    return this.rollupTxRep.find({
      where: { txId: In(txIds) },
      relations: ['rollup'],
    });
  }

  public async getPendingTxCount() {
    return this.rollupTxRep.count({
      where: { rollup: null },
    });
  }

  public async getPendingTxs(take?: number) {
    return this.rollupTxRep.find({
      where: { rollup: null },
      order: { created: 'ASC' },
      take,
    });
  }

  public async getLatestTxs(count: number) {
    return this.rollupTxRep.find({
      order: { created: 'DESC' },
      relations: ['rollup'],
      take: count,
    });
  }

  public async getRollupFromId(id: number) {
    return this.rollupRep.findOne({ id });
  }

  public async getSettledRollupsFromId(id: number) {
    return this.rollupRep.find({ where: { id: MoreThanOrEqual(id), status: 'SETTLED' } });
  }

  public async getRollupFromHash(hash: Buffer) {
    return this.rollupRep.findOne({ hash });
  }

  public async getRollupWithTxs(id: number) {
    return this.rollupRep.findOne({
      where: { id },
      relations: ['txs'],
    });
  }

  public async getRollupByDataRoot(dataRoot: Buffer) {
    return this.rollupRep.findOne({ dataRoot });
  }

  public async getLatestRollups(count: number) {
    return this.rollupRep.find({
      order: { id: 'DESC' },
      relations: ['txs'],
      take: count,
    });
  }

  public async getLatestSettledRollupId() {
    const latestRollup = await this.rollupRep.findOne({ status: 'SETTLED' }, { order: { id: 'DESC' } });
    return latestRollup ? latestRollup.id : -1;
  }

  public async getNextRollupId() {
    const latestRollup = await this.rollupRep.findOne(undefined, { order: { id: 'DESC' } });
    return latestRollup ? latestRollup.id + 1 : 0;
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

import { JoinSplitProof } from 'barretenberg/client_proofs/join_split_proof';
import { createHash } from 'crypto';
import { Connection, In, Repository } from 'typeorm';
import { RollupDao } from '../entity/rollup';
import { TxDao } from '../entity/tx';
import { Rollup } from '../rollup';

export class RollupDb {
  private rollupTxRep!: Repository<TxDao>;
  private rollupRep!: Repository<RollupDao>;

  constructor(private connection: Connection) {}

  private getTxId = (proofData: Buffer) => {
    return createHash('sha256').update(proofData).digest();
  };

  public init() {
    this.rollupTxRep = this.connection.getRepository(TxDao);
    this.rollupRep = this.connection.getRepository(RollupDao);
  }

  public async addTx(tx: JoinSplitProof) {
    const txId = this.getTxId(tx.proofData);

    const txDao = new TxDao();
    txDao.txId = txId;
    txDao.merkleRoot = tx.noteTreeRoot;
    txDao.newNote1 = tx.newNote1;
    txDao.newNote2 = tx.newNote2;
    txDao.nullifier1 = tx.nullifier1;
    txDao.nullifier2 = tx.nullifier2;
    txDao.publicInput = tx.publicInput;
    txDao.publicOutput = tx.publicOutput;
    txDao.proofData = tx.proofData;
    txDao.viewingKey1 = tx.viewingKeys[0];
    txDao.viewingKey2 = tx.viewingKeys[1];
    txDao.signature = tx.signature;
    txDao.created = new Date();
    await this.rollupTxRep.save(txDao);

    return txDao.txId;
  }

  public async addRollup(rollup: Rollup) {
    const rollupDao = new RollupDao();

    const txs = await Promise.all(
      rollup.proofs.map(async txBuf => {
        const txId = this.getTxId(txBuf);
        const txDao = await this.rollupTxRep.findOne({ txId });
        if (!txDao) {
          throw new Error(`RollupTx not found: ${txId}`);
        }
        if (txDao.rollup) {
          throw new Error(`RollupTx has been linked to a rollup: ${txId}`);
        }
        txDao.rollup = rollupDao;
        return txDao;
      }),
    );

    rollupDao.created = new Date();
    rollupDao.id = rollup.rollupId;
    rollupDao.dataRoot = rollup.newDataRoot;
    [rollupDao.nullRoot] = rollup.newNullRoots.slice(-1);
    rollupDao.txs = txs;
    rollupDao.status = 'CREATING';
    await this.rollupRep.save(rollupDao);
  }

  public async setRollupProof(rollupId: number, proofData: Buffer) {
    const rollupDao = await this.getRollup(rollupId);
    if (!rollupDao) {
      throw new Error(`Rollup not found: ${rollupId}`);
    }

    rollupDao.proofData = proofData;
    await this.rollupRep.save(rollupDao);
  }

  public async confirmRollupCreated(rollupId: number) {
    const rollupDao = await this.getRollup(rollupId);
    if (!rollupDao) {
      throw new Error(`Rollup not found: ${rollupId}`);
    }

    rollupDao.status = 'CREATED';
    await this.rollupRep.save(rollupDao);
  }

  public async confirmSent(rollupId: number) {
    const rollupDao = await this.getRollup(rollupId);
    if (!rollupDao) {
      throw new Error(`Rollup not found: ${rollupId}`);
    }

    if (rollupDao.status === 'SETTLED') {
      // When using local blockchain, the block gets resolved and confirmRollup is triggered before we call confirmSent.
      return;
    }

    rollupDao.status = 'PUBLISHED';
    await this.rollupRep.save(rollupDao);
  }

  public async confirmRollup(rollupId: number, ethBlock: number) {
    const rollup = await this.rollupRep.findOne(rollupId);
    if (!rollup) {
      throw new Error(`Rollup not found: ${rollupId}`);
    }

    rollup.ethBlock = ethBlock;
    rollup.status = 'SETTLED';
    await this.rollupRep.save(rollup);
  }

  public async deleteRollup(rollupId: number) {
    await this.rollupRep.delete(rollupId);
  }

  public async deletePendingRollups() {
    await this.rollupRep.delete({ status: 'CREATING' });
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

  public async getTxByTxId(txId: Buffer) {
    return this.rollupTxRep.findOne({ txId }, { relations: ['rollup'] });
  }

  public async getTxsByTxIds(txIds: Buffer[]) {
    return this.rollupTxRep.find({
      where: { txId: In(txIds) },
      relations: ['rollup'],
    });
  }

  public async getPendingTxs() {
    return this.rollupTxRep.find({
      where: { rollup: null },
      order: { id: 'ASC' },
    });
  }

  public async getLatestTxs(count: number) {
    return this.rollupTxRep.find({
      order: { id: 'DESC' },
      relations: ['rollup'],
      take: count,
    });
  }

  public async getRollup(id: number) {
    return this.rollupRep.findOne({ id });
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

  public async getNextRollupId() {
    const latestRollup = await this.rollupRep.findOne(undefined, { order: { id: 'DESC' } });
    return latestRollup ? latestRollup.id + 1 : 0;
  }

  public async getLastBlockNum() {
    const latest = await this.rollupRep.findOne(undefined, { order: { ethBlock: 'DESC' } });
    return latest && latest.ethBlock !== undefined ? latest.ethBlock : -1;
  }

  public async getDataRootsIndex(root: Buffer) {
    // Lookup and save the proofs data root index (for old root support).
    // prettier-ignore
    const emptyDataRoot = Buffer.from([
      0x1d, 0xf6, 0xbd, 0xe5, 0x05, 0x16, 0xdd, 0x12, 0x01, 0x08, 0x8f, 0xd8, 0xdd, 0xa8, 0x4c, 0x97,
      0xed, 0xa5, 0x65, 0x24, 0x28, 0xd1, 0xc7, 0xe8, 0x6a, 0xf5, 0x29, 0xcc, 0x5e, 0x0e, 0xb8, 0x21,
    ]);
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
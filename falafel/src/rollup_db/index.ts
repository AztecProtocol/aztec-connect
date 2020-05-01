import { Connection, createConnection, Repository } from 'typeorm';
import { RollupDao } from '../entity/rollup';
import { RollupTxDao } from '../entity/rollup_tx';
import { Rollup } from '../rollup';
import { toBufferBE } from 'bigint-buffer';

export class RollupDb {
  private rollupRep!: Repository<RollupDao>;
  private txRep!: Repository<RollupTxDao>;
  private rollupId = 0;

  constructor(private connection: Connection) {}

  async init() {
    this.rollupRep = this.connection.getRepository(RollupDao);
    this.txRep = this.connection.getRepository(RollupTxDao);
  }

  async addRollup(rollup: Rollup) {
    const rollupDao = new RollupDao();
    rollupDao.created = new Date();
    rollupDao.id = rollup.rollupId
    rollupDao.txs = rollup.txs.map(tx => {
      const txDao = new RollupTxDao();
      txDao.merkleRoot = tx.noteTreeRoot;
      txDao.newNote1 = tx.newNote1;
      txDao.newNote2 = tx.newNote2;
      txDao.nullifier1 = toBufferBE(tx.nullifier1, 16);
      txDao.nullifier2 = toBufferBE(tx.nullifier2, 16);
      txDao.publicInput = toBufferBE(tx.publicInput, 32);
      txDao.publicOutput = toBufferBE(tx.publicOutput, 32);
      return txDao;
    });
    await this.rollupRep.save(rollupDao);

    this.rollupId++
  }

  getNextRollupId() {
    return this.rollupId;
  }
}
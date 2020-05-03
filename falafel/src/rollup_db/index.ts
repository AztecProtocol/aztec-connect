import { Connection, Repository } from 'typeorm';
import { RollupDao } from '../entity/rollup';
import { RollupTxDao } from '../entity/rollup_tx';
import { Rollup } from '../rollup';

export class RollupDb {
  private rollupRep!: Repository<RollupDao>;
  private rollupId = 0;

  constructor(private connection: Connection) {}

  async init() {
    this.rollupRep = this.connection.getRepository(RollupDao);
  }

  async addRollup(rollup: Rollup) {
    const rollupDao = new RollupDao();
    rollupDao.created = new Date();
    rollupDao.id = rollup.rollupId;
    rollupDao.txs = rollup.txs.map(tx => {
      const txDao = new RollupTxDao();
      txDao.merkleRoot = tx.noteTreeRoot;
      txDao.newNote1 = tx.newNote1;
      txDao.newNote2 = tx.newNote2;
      txDao.nullifier1 = tx.nullifier1;
      txDao.nullifier2 = tx.nullifier2;
      txDao.publicInput = tx.publicInput;
      txDao.publicOutput = tx.publicOutput;
      return txDao;
    });
    await this.rollupRep.save(rollupDao);

    this.rollupId++;
  }

  getNextRollupId() {
    return this.rollupId;
  }
}

import { JoinSplitProof } from 'barretenberg/client_proofs/join_split_proof';
import { toBufferBE } from 'bigint-buffer';
import { Connection, Repository } from 'typeorm';
import { RollupDao } from '../entity/rollup';
import { RollupTxDao } from '../entity/rollup_tx';
import { Rollup } from '../rollup';

export class RollupDb {
  private rollupRep!: Repository<RollupDao>;

  constructor(private connection: Connection) {}

  public async init() {
    this.rollupRep = this.connection.getRepository(RollupDao);
  }

  public async addRollup(rollup: Rollup) {
    const rollupDao = new RollupDao();
    rollupDao.created = new Date();
    rollupDao.id = rollup.rollupId;
    rollupDao.dataRoot = rollup.newDataRoot;
    rollupDao.txs = rollup.proofs.map(txBuf => {
      const tx = new JoinSplitProof(txBuf, [], 0);
      const txDao = new RollupTxDao();
      txDao.merkleRoot = tx.noteTreeRoot;
      txDao.newNote1 = tx.newNote1;
      txDao.newNote2 = tx.newNote2;
      txDao.nullifier1 = toBufferBE(tx.nullifier1, 16);
      txDao.nullifier2 = toBufferBE(tx.nullifier2, 16);
      txDao.publicInput = tx.publicInput;
      txDao.publicOutput = tx.publicOutput;
      return txDao;
    });
    await this.rollupRep.save(rollupDao);
  }

  public async getRollupByDataRoot(dataRoot: Buffer) {
    return await this.rollupRep.findOne({ dataRoot });
  }

  public async getNextRollupId() {
    const latestRollup = await this.rollupRep.findOne(undefined, { order: { id: 'DESC' } });
    return latestRollup ? latestRollup.id + 1 : 0;
  }
}

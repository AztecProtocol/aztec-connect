import { Connection, createConnection, Repository } from 'typeorm';
import { RollupDao } from '../entity/rollup';
import { RollupProofDao } from '../entity/rollup_proof';
import { TxDao } from '../entity/tx';
import { RollupDb } from '../rollup_db';
import { randomRollup, randomRollupProof, randomTx } from '../rollup_db/fixtures';
import { getQuery } from './query_builder';

describe('Query Builder', () => {
  let connection: Connection;
  let txRep: Repository<TxDao>;
  let rollupProofRep: Repository<RollupProofDao>;
  let rollupDb: RollupDb;

  beforeEach(async () => {
    connection = await createConnection({
      type: 'sqlite',
      database: ':memory:',
      entities: [TxDao, RollupProofDao, RollupDao],
      dropSchema: true,
      synchronize: true,
      logging: false,
    });

    txRep = connection.getRepository(TxDao);
    rollupProofRep = connection.getRepository(RollupProofDao);

    rollupDb = new RollupDb(connection);
  });

  afterEach(async () => {
    await connection.close();
  });

  it('should get rollup proof by id', async () => {
    const rollupProof = randomRollupProof([]);
    await rollupDb.addRollupProof(rollupProof);

    const query = getQuery(rollupProofRep, { where: { id: rollupProof.id } });
    const rollupProofDao = (await query.getOne())!;
    expect(rollupProofDao.id).toStrictEqual(rollupProof.id);
    expect(rollupProofDao.created).toStrictEqual(rollupProof.created);
  });

  it('should select from two joined table', async () => {
    const txs: TxDao[] = [];
    const rollupProofs: RollupProofDao[] = [];
    for (let i = 0; i < 3; ++i) {
      const tx = randomTx();
      await rollupDb.addTx(tx);
      const rollupProof = randomRollupProof([tx], 0);
      await rollupDb.addRollupProof(rollupProof);
      txs.push(tx);
      rollupProofs.push(rollupProof);
    }

    for (let i = 0; i < rollupProofs.length; ++i) {
      const rollupProof = rollupProofs[i];
      const tx = txs[i];
      const query = getQuery(txRep, { where: { rollupId: rollupProof.id } }, { rollupId: 'rollupProof.id' }, [
        'rollupProof',
      ]);

      const savedTx = (await query.getOne())!;
      expect(savedTx.id).toStrictEqual(tx.id);
      expect(savedTx.rollupProof!.id).toStrictEqual(rollupProof.id);
    }
  });

  it('should select rows with non empty values from joined table', async () => {
    const rollupProofs: RollupProofDao[] = [];
    const rollups: RollupDao[] = [];
    for (let i = 0; i < 3; ++i) {
      const dataStartIndex = i * 2;
      const rollupProof = randomRollupProof([], dataStartIndex);
      await rollupDb.addRollupProof(rollupProof);
      rollupProofs.push(rollupProof);

      if (i < 2) {
        const rollupId = i;
        const rollup = randomRollup(rollupId, rollupProof);
        await rollupDb.addRollup(rollup);
        rollups.push(rollup);
      }
    }

    const queryOnRollupProof = getQuery(
      rollupProofRep,
      { where: { rollup_not_null: true } }, // eslint-disable-line camelcase
      {},
      ['rollup'],
    );
    const result = await queryOnRollupProof.getMany();
    expect(result.length).toBe(2);
    expect(result[0].id).toStrictEqual(rollupProofs[0].id);
    expect(result[1].id).toStrictEqual(rollupProofs[1].id);
  });

  it('should select from multiple joined tables', async () => {
    const txs: TxDao[] = [];
    const rollupProofs: RollupProofDao[] = [];
    const rollups: RollupDao[] = [];
    for (let i = 0; i < 5; ++i) {
      const tx = randomTx();
      await rollupDb.addTx(tx);

      const dataStartIndex = i * 2;
      const rollupProof = randomRollupProof([tx], dataStartIndex);
      await rollupDb.addRollupProof(rollupProof);

      const rollupId = i;
      const rollup = randomRollup(rollupId, rollupProof);
      await rollupDb.addRollup(rollup);

      if (i < 3) {
        await rollupDb.confirmMined(rollupId);
      }

      txs.push(tx);
      rollupProofs.push(rollupProof);
      rollups.push(rollup);
    }

    const queryOnTx = getQuery(
      txRep,
      { where: { rollupId_gte: 2, mined_not_null: true } }, // eslint-disable-line camelcase
      { rollupId: 'rollup.id', mined: 'rollup.mined' },
      ['rollupProof', 'rollupProof.rollup'],
    );

    const result = await queryOnTx.getMany();
    expect(result.length).toBe(1);
    expect(result[0].id).toStrictEqual(txs[2].id);
    expect(result[0].rollupProof!.id).toStrictEqual(rollupProofs[2].id);
    expect(result[0].rollupProof!.rollup.id).toStrictEqual(rollups[2].id);

    const queryOnRollupProof = getQuery(
      rollupProofRep,
      { where: { id_gte: 2, mined_not_null: true } }, // eslint-disable-line camelcase
      { id: 'rollup.id', mined: 'rollup.mined' },
      ['rollup', 'txs'],
    );
    const result2 = await queryOnRollupProof.getMany();
    expect(result2.length).toBe(1);
    expect(result2[0].id).toStrictEqual(rollupProofs[2].id);
    expect(result2[0].rollup!.id).toStrictEqual(rollups[2].id);
    expect(result2[0].txs!.length).toBe(1);
    expect(result2[0].txs![0].id).toStrictEqual(txs[2].id);
  });
});

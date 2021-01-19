import { randomBytes } from 'crypto';
import { Connection, createConnection } from 'typeorm';
import { RollupDao } from '../entity/rollup';
import { RollupProofDao } from '../entity/rollup_proof';
import { TxDao } from '../entity/tx';
import { randomRollup, randomRollupProof, randomTx } from './fixtures';
import { RollupDb } from './';

describe('rollup_db', () => {
  let connection: Connection;
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
    rollupDb = new RollupDb(connection);
  });

  afterEach(async () => {
    await connection.close();
  });

  it('should add tx with no rollup', async () => {
    const txDao = randomTx(randomBytes(32));
    await rollupDb.addTx(txDao);

    const result = await rollupDb.getTx(txDao.id);
    expect(result!).toStrictEqual(txDao);
  });

  it('should get rollup proof by id', async () => {
    const rollup = randomRollupProof([]);
    await rollupDb.addRollupProof(rollup);

    const rollupDao = (await rollupDb.getRollupProof(rollup.id))!;
    expect(rollupDao.id).toStrictEqual(rollup.id);
    expect(rollupDao.proofData).toStrictEqual(rollup.proofData);
    expect(rollupDao.created).toStrictEqual(rollup.created);
  });

  it('should add rollup proof and insert its txs', async () => {
    const tx0 = randomTx();
    const tx1 = randomTx();

    const rollupProof = randomRollupProof([tx0, tx1]);
    await rollupDb.addRollupProof(rollupProof);

    const rollupDao = (await rollupDb.getRollupProof(rollupProof.id))!;
    const newTxDao0 = await rollupDb.getTx(tx0.id);
    expect(newTxDao0!.rollupProof).toStrictEqual(rollupDao);
    const newTxDao1 = await rollupDb.getTx(tx1.id);
    expect(newTxDao1!.rollupProof).toStrictEqual(rollupDao);
  });

  it('should add rollup proof and update the rollup id for its txs', async () => {
    const tx0 = randomTx();
    const tx1 = randomTx();
    await rollupDb.addTx(tx0);
    await rollupDb.addTx(tx1);

    expect(await rollupDb.getPendingTxCount()).toBe(2);

    const rollupProof = randomRollupProof([tx0]);
    await rollupDb.addRollupProof(rollupProof);

    const rollupDao = (await rollupDb.getRollupProof(rollupProof.id))!;

    const newTxDao0 = await rollupDb.getTx(tx0.id);
    expect(newTxDao0!.rollupProof).toStrictEqual(rollupDao);

    const newTxDao1 = await rollupDb.getTx(tx1.id);
    expect(newTxDao1!.rollupProof).toBeUndefined();

    expect(await rollupDb.getPendingTxCount()).toBe(1);
    expect(await rollupDb.getPendingTxs()).toStrictEqual([tx1]);
  });

  it('should update rollup id for txs when newer proof added', async () => {
    const tx0 = randomTx();
    const tx1 = randomTx();
    await rollupDb.addTx(tx0);
    await rollupDb.addTx(tx1);

    const rollupProof = randomRollupProof([tx0]);
    await rollupDb.addRollupProof(rollupProof);

    const rollupProof2 = randomRollupProof([tx0, tx1]);
    await rollupDb.addRollupProof(rollupProof2);

    const rollupProof3 = randomRollupProof([]);
    await rollupDb.addRollupProof(rollupProof3);

    const rollupDao = (await rollupDb.getRollupProof(rollupProof2.id))!;
    const newTxDao0 = await rollupDb.getTx(tx0.id);
    expect(newTxDao0!.rollupProof).toStrictEqual(rollupDao);
    const newTxDao1 = await rollupDb.getTx(tx1.id);
    expect(newTxDao1!.rollupProof).toStrictEqual(rollupDao);
  });

  it('should set tx rollup proof ids to null if rollup proof is deleted', async () => {
    const tx0 = randomTx();
    const tx1 = randomTx();

    const rollupProof = randomRollupProof([tx0, tx1]);
    await rollupDb.addRollupProof(rollupProof);

    await rollupDb.deleteRollupProof(rollupProof.id);

    const newTxDao0 = await rollupDb.getTx(tx0.id);
    expect(newTxDao0!.rollupProof).toBeUndefined();
    const newTxDao1 = await rollupDb.getTx(tx1.id);
    expect(newTxDao1!.rollupProof).toBeUndefined();
  });

  it('should delete orphaned rollup proof', async () => {
    const rollupProof = randomRollupProof([]);
    await rollupDb.addRollupProof(rollupProof);
    await rollupDb.deleteTxlessRollupProofs();
    const rollupDao = (await rollupDb.getRollupProof(rollupProof.id))!;
    expect(rollupDao).toBeUndefined();
  });

  it('should get rollup proofs by size', async () => {
    const tx0 = randomTx();
    const tx1 = randomTx();
    const tx2 = randomTx();

    const rollupProof = randomRollupProof([tx0], 0);
    await rollupDb.addRollupProof(rollupProof);

    const rollupProof2 = randomRollupProof([tx1, tx2], 1);
    await rollupDb.addRollupProof(rollupProof2);

    const newRollupProofs = await rollupDb.getRollupProofsBySize(1);
    expect(newRollupProofs!.length).toBe(1);
    expect(newRollupProofs![0].id).toStrictEqual(rollupProof.id);
    expect(newRollupProofs![0].txs[0]).toStrictEqual(tx0);

    const newRollupProofs2 = await rollupDb.getRollupProofsBySize(2);
    expect(newRollupProofs2!.length).toBe(1);
    expect(newRollupProofs2![0].id).toStrictEqual(rollupProof2.id);
    expect(newRollupProofs2![0].txs.length).toBe(2);
    expect(newRollupProofs2![0].txs[0]).toStrictEqual(tx1);
    expect(newRollupProofs2![0].txs[1]).toStrictEqual(tx2);

    const newRollupProofs3 = await rollupDb.getRollupProofsBySize(3);
    expect(newRollupProofs3!.length).toBe(0);
  });

  it('should add and get rollup with txs', async () => {
    const tx0 = randomTx();
    const tx1 = randomTx();
    const rollupProof = randomRollupProof([tx0, tx1], 0);
    const rollup = randomRollup(0, rollupProof);

    await rollupDb.addRollup(rollup);

    const newRollup = (await rollupDb.getRollup(0))!;
    expect(newRollup).toStrictEqual(rollup);
  });

  it('should get settled txs', async () => {
    const tx0 = randomTx();
    const tx1 = randomTx();
    const rollupProof = randomRollupProof([tx0, tx1], 0);
    const rollup = randomRollup(0, rollupProof);

    await rollupDb.addRollup(rollup);

    const settledRollups1 = await rollupDb.getSettledRollups();
    expect(settledRollups1.length).toBe(0);

    await rollupDb.confirmMined(rollup.id);

    const settledRollups2 = await rollupDb.getSettledRollups();
    expect(settledRollups2.length).toBe(1);
    expect(settledRollups2[0].rollupProof).not.toBeUndefined();
  });

  it('should get unsettled tx count', async () => {
    const tx0 = randomTx();
    await rollupDb.addTx(tx0);

    expect(await rollupDb.getUnsettledTxCount()).toBe(1);

    const rollupProof = randomRollupProof([tx0], 0);
    await rollupDb.addRollupProof(rollupProof);

    expect(await rollupDb.getUnsettledTxCount()).toBe(1);

    const rollup = randomRollup(0, rollupProof);
    await rollupDb.addRollup(rollup);

    expect(await rollupDb.getUnsettledTxCount()).toBe(1);

    await rollupDb.confirmMined(rollup.id);

    expect(await rollupDb.getUnsettledTxCount()).toBe(0);
  });
});

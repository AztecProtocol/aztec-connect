import { randomBytes } from 'crypto';
import { Connection, createConnection } from 'typeorm';
import { AccountTxDao } from '../entity/account_tx';
import { JoinSplitTxDao } from '../entity/join_split_tx';
import { RollupDao } from '../entity/rollup';
import { RollupProofDao } from '../entity/rollup_proof';
import { TxDao } from '../entity/tx';
import { randomRollup, randomRollupProof, randomTx } from './fixtures';
import { RollupDb, TypeOrmRollupDb } from './';
import { EthAddress } from 'barretenberg/address';
import { TxHash } from 'barretenberg/tx_hash';

describe('rollup_db', () => {
  let connection: Connection;
  let rollupDb: RollupDb;

  beforeEach(async () => {
    connection = await createConnection({
      type: 'sqlite',
      database: ':memory:',
      entities: [TxDao, RollupProofDao, RollupDao, JoinSplitTxDao, AccountTxDao],
      dropSchema: true,
      synchronize: true,
      logging: false,
    });
    rollupDb = new TypeOrmRollupDb(connection);
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
    const tx2 = randomTx();
    await rollupDb.addTx(tx0);
    await rollupDb.addTx(tx1);
    await rollupDb.addTx(tx2);

    expect(await rollupDb.getPendingTxCount()).toBe(3);

    {
      const rollupProof = randomRollupProof([tx0]);
      await rollupDb.addRollupProof(rollupProof);

      // Check the rollup proof is associated with tx0.
      const rollupDao = (await rollupDb.getRollupProof(rollupProof.id))!;
      const newTxDao0 = await rollupDb.getTx(tx0.id);
      expect(newTxDao0!.rollupProof).toStrictEqual(rollupDao);

      // Check tx1 is still pending.
      const newTxDao1 = await rollupDb.getTx(tx1.id);
      expect(newTxDao1!.rollupProof).toBeUndefined();

      expect(await rollupDb.getPendingTxCount()).toBe(2);
      expect(await rollupDb.getPendingTxs()).toStrictEqual([tx1, tx2]);
    }

    {
      // Add a new rollup proof containing tx0 and tx1.
      const rollupProof = randomRollupProof([tx0, tx1]);
      await rollupDb.addRollupProof(rollupProof);

      // Check the rollup proof is associated with tx0 and tx1.
      const rollupDao = (await rollupDb.getRollupProof(rollupProof.id))!;
      const newTxDao0 = await rollupDb.getTx(tx0.id);
      const newTxDao1 = await rollupDb.getTx(tx1.id);
      expect(newTxDao0!.rollupProof).toStrictEqual(rollupDao);
      expect(newTxDao1!.rollupProof).toStrictEqual(rollupDao);

      expect(await rollupDb.getPendingTxs()).toStrictEqual([tx2]);
    }
  });

  it('should update rollup id for txs when newer proof added', async () => {
    const tx0 = randomTx();
    const tx1 = randomTx();
    const tx2 = randomTx();
    const tx3 = randomTx();
    await rollupDb.addTx(tx0);
    await rollupDb.addTx(tx1);
    await rollupDb.addTx(tx2);
    await rollupDb.addTx(tx3);

    const rollupProof1 = randomRollupProof([tx0, tx1]);
    await rollupDb.addRollupProof(rollupProof1);

    const rollupProof2 = randomRollupProof([tx2, tx3]);
    await rollupDb.addRollupProof(rollupProof2);

    const rollupProof3 = randomRollupProof([tx0, tx1, tx2, tx3]);
    await rollupDb.addRollupProof(rollupProof3);

    expect((await rollupDb.getRollupProof(rollupProof1.id, true))!.txs).toHaveLength(0);
    expect((await rollupDb.getRollupProof(rollupProof2.id, true))!.txs).toHaveLength(0);
    expect((await rollupDb.getRollupProof(rollupProof3.id, true))!.txs).toHaveLength(4);

    const rollupDao = (await rollupDb.getRollupProof(rollupProof3.id))!;
    expect((await rollupDb.getTx(tx0.id))!.rollupProof).toStrictEqual(rollupDao);
    expect((await rollupDb.getTx(tx1.id))!.rollupProof).toStrictEqual(rollupDao);
    expect((await rollupDb.getTx(tx2.id))!.rollupProof).toStrictEqual(rollupDao);
    expect((await rollupDb.getTx(tx3.id))!.rollupProof).toStrictEqual(rollupDao);

    const rollupDaoWithTxs = (await rollupDb.getRollupProof(rollupProof3.id, true))!;
    expect(rollupDaoWithTxs.txs).toStrictEqual([tx0, tx1, tx2, tx3]);
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

    await rollupDb.confirmMined(rollup.id, 0, 0n, new Date(), TxHash.random());

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

    await rollupDb.confirmMined(rollup.id, 0, 0n, new Date(), TxHash.random());

    expect(await rollupDb.getUnsettledTxCount()).toBe(0);
  });

  it('should get unsettled js tx for account', async () => {
    const addr = EthAddress.randomAddress();
    const tx0 = randomTx(undefined, addr, 10n);
    const tx1 = randomTx(undefined, addr, 20n);
    const tx2 = randomTx(undefined, addr, 40n);
    await rollupDb.addTx(tx0);
    await rollupDb.addTx(tx1);
    await rollupDb.addTx(tx2);

    {
      const result = await rollupDb.getUnsettledJoinSplitTxsForInputAddress(addr);
      expect(result.length).toBe(3);
      expect(result[0].publicInput).toBe(10n);
      expect(result[1].publicInput).toBe(20n);
      expect(result[2].publicInput).toBe(40n);
    }

    const rollupProof = randomRollupProof([tx0], 0);
    await rollupDb.addRollupProof(rollupProof);

    const rollup = randomRollup(0, rollupProof);
    await rollupDb.addRollup(rollup);

    await rollupDb.confirmMined(rollup.id, 0, 0n, new Date(), TxHash.random());

    {
      const result = await rollupDb.getUnsettledJoinSplitTxsForInputAddress(addr);
      expect(result.length).toBe(2);
      expect(result[0].publicInput).toBe(20n);
      expect(result[1].publicInput).toBe(40n);
    }
  });

  it('should delete unsettled rollups', async () => {
    const tx0 = randomTx();
    await rollupDb.addTx(tx0);

    expect(await rollupDb.getUnsettledTxCount()).toBe(1);
    expect(await rollupDb.getUnsettledRollups()).toHaveLength(0);

    const rollupProof = randomRollupProof([tx0], 0);
    await rollupDb.addRollupProof(rollupProof);

    const rollup = randomRollup(0, rollupProof);
    await rollupDb.addRollup(rollup);

    expect(await rollupDb.getUnsettledTxCount()).toBe(1);
    expect(await rollupDb.getUnsettledRollups()).toHaveLength(1);

    await rollupDb.deleteUnsettledRollups();

    expect(await rollupDb.getUnsettledTxCount()).toBe(1);
    expect(await rollupDb.getUnsettledRollups()).toHaveLength(0);
  });
});

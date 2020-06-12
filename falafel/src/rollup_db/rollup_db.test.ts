import { JoinSplitProof } from 'barretenberg/client_proofs/join_split_proof';
import { HashPath } from 'barretenberg/merkle_tree';
import { randomBytes } from 'crypto';
import { createConnection, Connection } from 'typeorm';
import { RollupDb } from './';
import { RollupDao } from '../entity/rollup';
import { TxDao } from '../entity/tx';
import { Rollup } from '../rollup';

const randomTx = () => new JoinSplitProof(randomBytes(9 * 32), [randomBytes(32), randomBytes(32)]);

const randomRollup = (rollupId: number, txs: JoinSplitProof[]) =>
  new Rollup(
    rollupId,
    0,
    txs.map(tx => tx.proofData),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
    new HashPath([[randomBytes(32)]]),
    new HashPath([[randomBytes(32)]]),
    randomBytes(32),
    [randomBytes(32)],
    [new HashPath([[randomBytes(32)]])],
    [new HashPath([[randomBytes(32)]])],
    randomBytes(32),
    randomBytes(32),
    new HashPath([[randomBytes(28)]]),
    new HashPath([[randomBytes(28)]]),
    [new HashPath([[randomBytes(28)]])],
    [0],
  );

describe('Rollup DB', () => {
  let connection: Connection;
  let rollupDb: RollupDb;

  beforeEach(async () => {
    connection = await createConnection({
      type: 'sqlite',
      database: ':memory:',
      entities: [TxDao, RollupDao],
      dropSchema: true,
      synchronize: true,
      logging: false,
    });
    rollupDb = new RollupDb(connection);
    rollupDb.init();
  });

  afterEach(async () => {
    await connection.close();
  });

  it('should add raw data and tx with no rollup', async () => {
    const tx = randomTx();
    const txId = await rollupDb.addTx(tx);

    const txDao = (await rollupDb.getTxByTxId(txId)) as TxDao;
    expect(txId.length).toBe(32);
    expect(txDao.txId).toEqual(txId);
    expect(txDao.rollup).toBe(null);
    expect(txDao.merkleRoot).toEqual(tx.noteTreeRoot);
    expect(txDao.newNote1).toEqual(tx.newNote1);
    expect(txDao.newNote2).toEqual(tx.newNote2);
    expect(txDao.nullifier1).toEqual(tx.nullifier1);
    expect(txDao.nullifier2).toEqual(tx.nullifier2);
    expect(txDao.publicInput).toEqual(tx.publicInput);
    expect(txDao.publicOutput).toEqual(tx.publicOutput);
    expect(txDao.proofData).toEqual(tx.proofData);
    expect(txDao.viewingKey1).toEqual(tx.viewingKeys[0]);
    expect(txDao.viewingKey2).toEqual(tx.viewingKeys[1]);
  });

  it('should add rollup and update the rollup for all its txs', async () => {
    const tx0 = randomTx();
    const tx1 = randomTx();
    const txId0 = await rollupDb.addTx(tx0);
    const txId1 = await rollupDb.addTx(tx1);

    let txDao0 = await rollupDb.getTxByTxId(txId0);
    expect(txDao0!.rollup).toBe(null);

    const rollup = randomRollup(0, [tx0]);
    await rollupDb.addRollup(rollup);

    const rollupDao = (await rollupDb.getRollup(0)) as RollupDao;
    expect(rollupDao.id).toBe(0);
    expect(rollupDao.dataRoot).toEqual(rollup.newDataRoot);
    expect(rollupDao.nullRoot).toEqual(rollup.newNullRoots[rollup.newNullRoots.length - 1]);
    expect(rollupDao.proofData).toBe(null);
    expect(rollupDao.ethBlock).toBe(null);
    expect(rollupDao.ethTxHash).toBe(null);
    expect(rollupDao.status).toBe('CREATING');

    txDao0 = await rollupDb.getTxByTxId(txId0);
    expect(txDao0!.rollup).toEqual(rollupDao);

    const txDao1 = await rollupDb.getTxByTxId(txId1);
    expect(txDao1!.rollup).toBe(null);
  });

  it('add proof data to rollup', async () => {
    const tx = randomTx();
    await rollupDb.addTx(tx);

    const rollupId = 3;
    await rollupDb.addRollup(randomRollup(rollupId, [tx]));

    const rollupDao = await rollupDb.getRollup(rollupId);
    expect(rollupDao!.proofData).toBe(null);

    const proofData = randomBytes(100);
    await rollupDb.setRollupProof(rollupId, proofData);

    const updatedRollupDao = await rollupDb.getRollup(rollupId);
    expect(updatedRollupDao).toEqual({
      ...rollupDao,
      proofData,
    });
  });

  it('update rollup status through confirmRollupCreated', async () => {
    const tx = randomTx();
    await rollupDb.addTx(tx);

    const rollupId = 3;
    await rollupDb.addRollup(randomRollup(rollupId, [tx]));

    const rollupDao = await rollupDb.getRollup(rollupId);
    expect(rollupDao!.status).toBe('CREATING');

    await rollupDb.confirmRollupCreated(rollupId);

    const updatedRollupDao = await rollupDb.getRollup(rollupId);
    expect(updatedRollupDao).toEqual({
      ...rollupDao,
      status: 'CREATED',
    });
  });

  it('update rollup status through confirmSent', async () => {
    const tx = randomTx();
    await rollupDb.addTx(tx);

    const rollupId = 3;
    await rollupDb.addRollup(randomRollup(rollupId, [tx]));

    const rollupDao = await rollupDb.getRollup(rollupId);
    expect(rollupDao!.status).toBe('CREATING');

    await rollupDb.confirmSent(rollupId);

    const updatedRollupDao = await rollupDb.getRollup(rollupId);
    expect(updatedRollupDao).toEqual({
      ...rollupDao,
      status: 'PUBLISHED',
    });
  });

  it('update rollup status and block info through confirmRollup', async () => {
    const tx = randomTx();
    await rollupDb.addTx(tx);

    const rollupId = 3;
    await rollupDb.addRollup(randomRollup(rollupId, [tx]));
    await rollupDb.confirmSent(rollupId);

    const rollupDao = (await rollupDb.getRollup(rollupId)) as RollupDao;
    expect(rollupDao.ethBlock).toBe(null);
    expect(rollupDao.status).toBe('PUBLISHED');

    const ethBlock = 123;
    await rollupDb.confirmRollup(rollupId, ethBlock);

    const updatedRollupDao = (await rollupDb.getRollup(rollupId)) as RollupDao;
    expect(updatedRollupDao).toEqual({
      ...rollupDao,
      ethBlock,
      status: 'SETTLED',
    });
  });

  it('should delete rollup and unlink from its txs', async () => {
    const tx0 = randomTx();
    const tx1 = randomTx();
    const txId0 = await rollupDb.addTx(tx0);
    const txId1 = await rollupDb.addTx(tx1);

    await rollupDb.addRollup(randomRollup(0, [tx0]));
    await rollupDb.addRollup(randomRollup(1, [tx1]));

    const rollupDao = await rollupDb.getRollup(0);
    const txDao0 = await rollupDb.getTxByTxId(txId0);
    expect(rollupDao!.id).toBe(0);
    expect(txDao0!.rollup).toEqual(rollupDao);

    await rollupDb.deleteRollup(0);

    const rollupDao0After = await rollupDb.getRollup(0);
    const txDao0After = await rollupDb.getTxByTxId(txId0);
    expect(rollupDao0After).toBe(undefined);
    expect(txDao0After!.rollup).toBe(null);

    const rollupDao1 = await rollupDb.getRollup(1);
    const txDao1 = await rollupDb.getTxByTxId(txId1);
    expect(rollupDao1!.id).toBe(1);
    expect(txDao1!.rollup).toEqual(rollupDao1);
  });

  it('should delete all pending rollups', async () => {
    const tx0 = randomTx();
    const tx1 = randomTx();
    const tx2 = randomTx();
    const txId0 = await rollupDb.addTx(tx0);
    const txId1 = await rollupDb.addTx(tx1);
    const txId2 = await rollupDb.addTx(tx2);

    await rollupDb.addRollup(randomRollup(0, [tx0]));
    await rollupDb.addRollup(randomRollup(1, [tx1]));
    await rollupDb.addRollup(randomRollup(2, [tx2]));

    await rollupDb.confirmRollupCreated(1);

    await rollupDb.deletePendingRollups();

    const rollupDao0 = await rollupDb.getRollup(0);
    const rollupDao1 = await rollupDb.getRollup(1);
    const rollupDao2 = await rollupDb.getRollup(2);
    const txDao0 = await rollupDb.getTxByTxId(txId0);
    const txDao1 = await rollupDb.getTxByTxId(txId1);
    const txDao2 = await rollupDb.getTxByTxId(txId2);
    expect(rollupDao0).toBe(undefined);
    expect(rollupDao1).not.toBe(undefined);
    expect(rollupDao2).toBe(undefined);
    expect(txDao0!.rollup).toBe(null);
    expect(txDao1!.rollup).not.toBe(null);
    expect(txDao2!.rollup).toBe(null);
  });

  it('get pending rollups in ascending order', async () => {
    const tx0 = randomTx();
    const tx1 = randomTx();
    const tx2 = randomTx();
    await rollupDb.addTx(tx0);
    await rollupDb.addTx(tx1);
    await rollupDb.addTx(tx2);

    const rollup0 = randomRollup(0, [tx0]);
    await rollupDb.addRollup(rollup0);
    const rollup1 = randomRollup(1, [tx1]);
    await rollupDb.addRollup(rollup1);
    const rollup2 = randomRollup(2, [tx2]);
    await rollupDb.addRollup(rollup2);

    await rollupDb.confirmRollupCreated(rollup1.rollupId);

    const pendingRollups = await rollupDb.getPendingRollups();

    const pendingRollupIds = pendingRollups.map(r => r.id);
    expect(pendingRollupIds).toEqual([0, 2]);
  });

  it('get created rollups and their txs in ascending order', async () => {
    const tx0 = randomTx();
    const tx1 = randomTx();
    const tx2 = randomTx();
    await rollupDb.addTx(tx0);
    const txId1 = await rollupDb.addTx(tx1);
    const txId2 = await rollupDb.addTx(tx2);

    const rollup0 = randomRollup(0, [tx0]);
    await rollupDb.addRollup(rollup0);
    const rollup1 = randomRollup(1, [tx1]);
    await rollupDb.addRollup(rollup1);
    const rollup2 = randomRollup(2, [tx2]);
    await rollupDb.addRollup(rollup2);

    await rollupDb.confirmRollupCreated(rollup1.rollupId);
    await rollupDb.confirmRollupCreated(rollup2.rollupId);

    const pendingRollups = await rollupDb.getCreatedRollups();

    expect(pendingRollups.length).toBe(2);
    const pendingRollupIds = pendingRollups.map(r => r.id);
    expect(pendingRollupIds).toEqual([1, 2]);
    const pendingTxsIds: Buffer[] = [];
    pendingRollups.forEach(r => {
      expect(r.txs.length).toBe(1);
      pendingTxsIds.push(r.txs[0].txId);
    });
    expect(pendingTxsIds).toEqual([txId1, txId2]);
  });

  it('get tx and its rollup by txId', async () => {
    const tx0 = randomTx();
    const txId0 = await rollupDb.addTx(tx0);
    const txId1 = await rollupDb.addTx(randomTx());

    const randomtxDao = await rollupDb.getTxByTxId(Buffer.alloc(32, 1));
    expect(randomtxDao).toBe(undefined);

    let txDao0 = await rollupDb.getTxByTxId(txId0);
    expect(txDao0!.txId).toEqual(txId0);
    expect(txDao0!.rollup).toBe(null);

    const rollupId = 3;
    await rollupDb.addRollup(randomRollup(rollupId, [tx0]));

    txDao0 = await rollupDb.getTxByTxId(txId0);
    expect(txDao0!.txId).toEqual(txId0);
    expect(txDao0!.rollup!.id).toBe(rollupId);

    const txDao1 = await rollupDb.getTxByTxId(txId1);
    expect(txDao1!.txId).toEqual(txId1);
    expect(txDao1!.rollup).toBe(null);
  });

  it('get txs and their rollups by txIds', async () => {
    let txs = await rollupDb.getTxsByTxIds([randomBytes(32)]);
    expect(txs).toEqual([]);

    const txId0 = await rollupDb.addTx(randomTx());
    const txId1 = await rollupDb.addTx(randomTx());

    txs = await rollupDb.getTxsByTxIds([txId0, txId1]);
    let txIds = txs.map(tx => tx.txId);
    expect(txIds.length).toBe(2);
    expect(txIds).toEqual(expect.arrayContaining([txId0, txId1]));

    const tx2 = randomTx();
    const txId2 = await rollupDb.addTx(tx2);

    await rollupDb.addRollup(randomRollup(0, [tx2]));

    txs = await rollupDb.getTxsByTxIds([txId0, txId2]);
    txIds = txs.map(tx => tx.txId);
    expect(txIds.length).toBe(2);
    expect(txIds).toEqual(expect.arrayContaining([txId0, txId2]));

    const rollupDao = await rollupDb.getRollup(0);
    txs.forEach(tx => {
      if (tx.txId.equals(txId2)) {
        expect(tx.rollup).toEqual(rollupDao);
      } else {
        expect(tx.rollup).toBe(null);
      }
    });
  });

  it('get pending txs in ascending order', async () => {
    let pendingTxs = await rollupDb.getPendingTxs();
    let txIds = pendingTxs.map(tx => tx.txId);
    expect(txIds).toEqual([]);

    const tx0 = randomTx();
    const tx1 = randomTx();
    const tx2 = randomTx();
    const txId0 = await rollupDb.addTx(tx0);
    await rollupDb.addTx(tx1);
    const txId2 = await rollupDb.addTx(tx2);
    await rollupDb.addRollup(randomRollup(1, [tx1]));

    pendingTxs = await rollupDb.getPendingTxs();
    txIds = pendingTxs.map(tx => tx.txId);
    expect(txIds).toEqual([txId0, txId2]);
  });

  it('get latest txs and their rollups in descending order', async () => {
    let txs = await rollupDb.getLatestTxs(5);
    let txIds = txs.map(tx => tx.txId);
    expect(txIds).toEqual([]);

    const txId0 = await rollupDb.addTx(randomTx());
    const txId1 = await rollupDb.addTx(randomTx());

    txs = await rollupDb.getLatestTxs(5);
    txIds = txs.map(tx => tx.txId);
    expect(txIds).toEqual([txId1, txId0]);

    const txId2 = await rollupDb.addTx(randomTx());
    const tx3 = randomTx();
    const txId3 = await rollupDb.addTx(tx3);

    await rollupDb.addRollup(randomRollup(0, [tx3]));

    txs = await rollupDb.getLatestTxs(3);
    txIds = txs.map(tx => tx.txId);
    expect(txIds).toEqual([txId3, txId2, txId1]);

    const rollupDao = await rollupDb.getRollup(0);
    expect(txs[0].rollup).toEqual(rollupDao);
    expect(txs[1].rollup).toBe(null);
    expect(txs[2].rollup).toBe(null);
  });

  it('get latest rollups and their txs in descending order', async () => {
    let rollups = await rollupDb.getLatestRollups(3);
    let rollupIds = rollups.map(r => r.id);
    expect(rollupIds).toEqual([]);

    const tx0 = randomTx();
    const tx1 = randomTx();
    const tx2 = randomTx();
    await rollupDb.addTx(tx0);
    const txId1 = await rollupDb.addTx(tx1);
    const txId2 = await rollupDb.addTx(tx2);

    await rollupDb.addRollup(randomRollup(0, [tx0]));

    rollups = await rollupDb.getLatestRollups(3);
    rollupIds = rollups.map(r => r.id);
    expect(rollupIds).toEqual([0]);

    await rollupDb.addRollup(randomRollup(1, [tx1]));
    await rollupDb.addRollup(randomRollup(2, [tx2]));

    rollups = await rollupDb.getLatestRollups(2);
    rollupIds = rollups.map(r => r.id);
    expect(rollupIds).toEqual([2, 1]);
    expect(rollups[0].txs.length).toBe(1);
    expect(rollups[0].txs[0].txId).toEqual(txId2);
    expect(rollups[1].txs.length).toBe(1);
    expect(rollups[1].txs[0].txId).toEqual(txId1);
  });

  it('find data roots index by merkle root', async () => {
    const tx0 = randomTx();
    const tx1 = randomTx();
    await rollupDb.addTx(tx0);
    await rollupDb.addTx(tx1);
    const rollup0 = randomRollup(0, [tx0]);
    await rollupDb.addRollup(rollup0);
    const rollup1 = randomRollup(1, [tx1]);
    await rollupDb.addRollup(rollup1);

    // prettier-ignore
    const emptyDataRoot = Buffer.from([
      0x1d, 0xf6, 0xbd, 0xe5, 0x05, 0x16, 0xdd, 0x12, 0x01, 0x08, 0x8f, 0xd8, 0xdd, 0xa8, 0x4c, 0x97,
      0xed, 0xa5, 0x65, 0x24, 0x28, 0xd1, 0xc7, 0xe8, 0x6a, 0xf5, 0x29, 0xcc, 0x5e, 0x0e, 0xb8, 0x21,
    ]);
    expect(await rollupDb.getDataRootsIndex(emptyDataRoot)).toBe(0);

    expect(await rollupDb.getDataRootsIndex(rollup0.newDataRoot)).toBe(1);
    expect(await rollupDb.getDataRootsIndex(rollup1.newDataRoot)).toBe(2);
  });
});

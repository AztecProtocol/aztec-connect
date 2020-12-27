import { ProofData } from 'barretenberg/client_proofs/proof_data';
import { randomBytes } from 'crypto';
import { Connection, createConnection } from 'typeorm';
import { RollupDao } from '../entity/rollup';
import { RollupProofDao } from '../entity/rollup_proof';
import { TxDao } from '../entity/tx';
import { RollupDb } from './';

const randomTx = (signature?: Buffer): TxDao => {
  const proofData = new ProofData(
    Buffer.concat([
      Buffer.alloc(32), // proofId
      randomBytes(32), // publicInput
      randomBytes(32), // publicOutput
      Buffer.alloc(32), // assetId
      randomBytes(64), // note1
      randomBytes(64), // note2
      randomBytes(32), // nullifier1
      randomBytes(32), // nullifier2
      Buffer.concat([Buffer.alloc(12), randomBytes(20)]),
      Buffer.concat([Buffer.alloc(12), randomBytes(20)]),
    ]),
    [randomBytes(32), randomBytes(32)],
    signature,
  );
  return new TxDao({
    id: proofData.txId,
    proofData: proofData.proofData,
    viewingKey1: proofData.viewingKeys![0],
    viewingKey2: proofData.viewingKeys![1],
    nullifier1: proofData.nullifier1,
    nullifier2: proofData.nullifier2,
    dataRootsIndex: 0,
    created: new Date(),
    signature,
  });
};

const randomRollupProof = (txs: TxDao[], dataStartIndex = 0, rollupSize = txs.length) =>
  new RollupProofDao({
    id: randomBytes(32),
    txs,
    dataStartIndex,
    rollupSize,
    proofData: randomBytes(1024),
    created: new Date(),
  });

const randomRollup = (rollupId: number, rollupProof: RollupProofDao) =>
  new RollupDao({
    id: rollupId,
    dataRoot: randomBytes(32),
    rollupProof,
    viewingKeys: Buffer.concat(rollupProof.txs.map(tx => [tx.viewingKey1, tx.viewingKey2]).flat()),
    created: new Date(),
  });

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
});

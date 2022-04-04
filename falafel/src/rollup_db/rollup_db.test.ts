import { AccountId, AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { TxHash, TxType } from '@aztec/barretenberg/blockchain';
import { randomBytes } from 'crypto';
import { Connection, createConnection } from 'typeorm';
import { AssetMetricsDao, AccountDao, ClaimDao, RollupDao, RollupProofDao, TxDao } from '../entity';
import { RollupDb, TypeOrmRollupDb } from './';
import { randomAccountTx, randomClaim, randomRollup, randomRollupProof, randomTx } from './fixtures';

describe('rollup_db', () => {
  let connection: Connection;
  let rollupDb: RollupDb;

  beforeEach(async () => {
    connection = await createConnection({
      type: 'sqlite',
      database: ':memory:',
      entities: [TxDao, RollupProofDao, RollupDao, AccountDao, ClaimDao, AssetMetricsDao],
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
    const txDao = randomTx({ signature: randomBytes(32) });
    await rollupDb.addTx(txDao);

    const result = await rollupDb.getTx(txDao.id);
    expect(result!).toEqual(txDao);
  });

  it('should add account tx', async () => {
    const txDao = randomAccountTx();
    await rollupDb.addTx(txDao);

    expect(await rollupDb.getAccountTxCount()).toBe(1);
    expect(await rollupDb.getAccountCount()).toBe(1);
  });

  it('should count accounts that have nonce 1', async () => {
    const txs = [
      randomAccountTx({ nonce: 1 }),
      randomAccountTx({ nonce: 2 }),
      randomAccountTx({ nonce: 1 }),
      randomAccountTx({ nonce: 3 }),
    ];
    for (const tx of txs) {
      await rollupDb.addTx(tx);
    }

    expect(await rollupDb.getAccountTxCount()).toBe(4);
    expect(await rollupDb.getAccountCount()).toBe(2);
  });

  it('should delete an account when its tx is deleted', async () => {
    const accountPublicKey0 = GrumpkinAddress.randomAddress();
    const accountPublicKey1 = GrumpkinAddress.randomAddress();
    const aliasHash0 = AliasHash.random();
    const aliasHash1 = AliasHash.random();
    const txs = [
      randomAccountTx({ accountPublicKey: accountPublicKey0, aliasHash: aliasHash0, nonce: 1 }),
      randomAccountTx({ accountPublicKey: accountPublicKey0, aliasHash: aliasHash0, nonce: 2 }),
      randomAccountTx({ accountPublicKey: accountPublicKey0, aliasHash: aliasHash1, nonce: 3 }),
      randomAccountTx({ accountPublicKey: accountPublicKey1, aliasHash: aliasHash1, nonce: 4 }),
    ];
    for (const tx of txs) {
      await rollupDb.addTx(tx);
    }
    const rollupProof = randomRollupProof([txs[0], txs[2]]);
    await rollupDb.addRollupProof(rollupProof);

    expect(await rollupDb.getLatestAliasNonce(aliasHash0)).toBe(2);
    expect(await rollupDb.getLatestAliasNonce(aliasHash1)).toBe(4);
    expect(await rollupDb.getLatestAccountNonce(accountPublicKey0)).toBe(3);
    expect(await rollupDb.getLatestAccountNonce(accountPublicKey1)).toBe(4);

    // txs[1] and txs[3] will be deleted.
    await rollupDb.deletePendingTxs();

    expect(await rollupDb.getLatestAliasNonce(aliasHash0)).toBe(1);
    expect(await rollupDb.getLatestAliasNonce(aliasHash1)).toBe(3);
    expect(await rollupDb.getLatestAccountNonce(accountPublicKey0)).toBe(3);
    expect(await rollupDb.getLatestAccountNonce(accountPublicKey1)).toBe(0);
  });

  it('should bulk add txs', async () => {
    const txs = [
      TxType.DEPOSIT,
      TxType.WITHDRAW_TO_WALLET,
      TxType.ACCOUNT,
      TxType.DEFI_DEPOSIT,
      TxType.TRANSFER,
      TxType.WITHDRAW_TO_CONTRACT,
      TxType.ACCOUNT,
      TxType.DEFI_CLAIM,
    ].map(txType => randomTx({ txType }));

    await rollupDb.addTxs(txs);

    expect(await rollupDb.getTotalTxCount()).toBe(8);
    expect(await rollupDb.getJoinSplitTxCount()).toBe(4);
    expect(await rollupDb.getDefiTxCount()).toBe(1);
    expect(await rollupDb.getAccountTxCount()).toBe(2);
    expect(await rollupDb.getAccountCount()).toBe(2);
  });

  it('should get rollup proof by id', async () => {
    const rollup = randomRollupProof([]);
    await rollupDb.addRollupProof(rollup);

    const rollupDao = (await rollupDb.getRollupProof(rollup.id))!;
    expect(rollupDao.id).toStrictEqual(rollup.id);
    expect(rollupDao.proofData).toStrictEqual(rollup.proofData);
    expect(rollupDao.created).toStrictEqual(rollup.created);
  });

  it('should get rollups by an array of rollup ids', async () => {
    const rollups: RollupDao[] = [];
    for (let i = 0; i < 6; ++i) {
      const rollupProof = randomRollupProof([]);
      await rollupDb.addRollupProof(rollupProof);
      const rollup = randomRollup(i, rollupProof);
      await rollupDb.addRollup(rollup);
      rollups.push(rollup);
    }

    const saved = await rollupDb.getRollupsByRollupIds([1, 2, 5]);
    expect(saved.length).toBe(3);
    expect(saved.map(r => r.id)).toEqual(expect.arrayContaining([1, 2, 5]));
  });

  it('should add rollup proof and insert its txs', async () => {
    const tx0 = randomTx();
    const tx1 = randomTx();

    const rollupProof = randomRollupProof([tx0, tx1]);
    await rollupDb.addRollupProof(rollupProof);

    const rollupProofDao = (await rollupDb.getRollupProof(rollupProof.id))!;
    const newTxDao0 = await rollupDb.getTx(tx0.id);
    expect(newTxDao0!.rollupProof).toStrictEqual(rollupProofDao);
    const newTxDao1 = await rollupDb.getTx(tx1.id);
    expect(newTxDao1!.rollupProof).toStrictEqual(rollupProofDao);
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

  it('get nullifiers of unsettled txs', async () => {
    const tx0 = randomTx();
    tx0.nullifier2 = undefined;
    await rollupDb.addTx(tx0);

    const tx1 = randomTx();
    {
      await rollupDb.addTx(tx1);
      const rollupProof = randomRollupProof([tx1], 0);
      const rollup = randomRollup(0, rollupProof);
      await rollupDb.addRollup(rollup);
    }

    const tx2 = randomTx();
    {
      await rollupDb.addTx(tx2);
      const rollupProof = randomRollupProof([tx2], 1);
      const rollup = randomRollup(0, rollupProof);
      await rollupDb.addRollup(rollup);
      await rollupDb.confirmMined(rollup.id, 0, 0n, new Date(), TxHash.random(), [], [tx2.id], []);
    }

    const nullifiers = await rollupDb.getUnsettledNullifiers();
    expect(nullifiers.length).toBe(3);
    expect(nullifiers).toEqual(expect.arrayContaining([tx0.nullifier1, tx1.nullifier1, tx1.nullifier2]));
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
    const txs = [
      TxType.DEPOSIT,
      TxType.WITHDRAW_TO_WALLET,
      TxType.ACCOUNT,
      TxType.DEFI_DEPOSIT,
      TxType.TRANSFER,
      TxType.WITHDRAW_TO_CONTRACT,
      TxType.ACCOUNT,
      TxType.DEFI_CLAIM,
    ].map(txType => randomTx({ txType }));
    const rollupProof = randomRollupProof(txs, 0);
    const rollup = randomRollup(0, rollupProof);

    await rollupDb.addRollup(rollup);

    const newRollup = (await rollupDb.getRollup(0))!;
    expect(newRollup).toStrictEqual(rollup);

    expect(await rollupDb.getTotalTxCount()).toBe(8);
    expect(await rollupDb.getJoinSplitTxCount()).toBe(4);
    expect(await rollupDb.getDefiTxCount()).toBe(1);
    expect(await rollupDb.getAccountTxCount()).toBe(2);
    expect(await rollupDb.getAccountCount()).toBe(2);
  });

  it('should add rollup with account txs that have already in db', async () => {
    const txs = [randomAccountTx(), randomAccountTx()];
    for (const tx of txs) {
      await rollupDb.addTx(tx);
    }

    const rollupProof = randomRollupProof(txs, 0);
    const rollup = randomRollup(0, rollupProof);

    expect(await rollupDb.getAccountCount()).toBe(2);

    await rollupDb.addRollup(rollup);

    const newRollup = (await rollupDb.getRollup(0))!;
    expect(newRollup).toStrictEqual(rollup);

    expect(await rollupDb.getAccountCount()).toBe(2);
  });

  it('should return latest nonce for an account public key or alias hash', async () => {
    const accountPubKey0 = GrumpkinAddress.randomAddress();
    const accountPubKey1 = GrumpkinAddress.randomAddress();
    const aliasHash0 = AliasHash.random();
    const aliasHash1 = AliasHash.random();
    const txs = [
      randomAccountTx({ accountPublicKey: accountPubKey0, aliasHash: aliasHash0, nonce: 3 }),
      randomAccountTx({ accountPublicKey: accountPubKey0, aliasHash: aliasHash1, nonce: 5 }),
      randomAccountTx({ accountPublicKey: accountPubKey1, aliasHash: aliasHash1, nonce: 6 }),
      randomAccountTx({ accountPublicKey: accountPubKey1, aliasHash: aliasHash0, nonce: 9 }),
    ];
    for (const tx of txs) {
      await rollupDb.addTx(tx);
    }

    expect(await rollupDb.getLatestAccountNonce(accountPubKey0)).toBe(5);
    expect(await rollupDb.getLatestAccountNonce(accountPubKey1)).toBe(9);
    expect(await rollupDb.getLatestAccountNonce(GrumpkinAddress.randomAddress())).toBe(0);

    expect(await rollupDb.getLatestAliasNonce(aliasHash0)).toBe(9);
    expect(await rollupDb.getLatestAliasNonce(aliasHash1)).toBe(6);
    expect(await rollupDb.getLatestAliasNonce(AliasHash.random())).toBe(0);
  });

  it('get account id for an alias hash and an optional nonce', async () => {
    const accountPubKey0 = GrumpkinAddress.randomAddress();
    const accountPubKey1 = GrumpkinAddress.randomAddress();
    const aliasHash0 = AliasHash.random();
    const aliasHash1 = AliasHash.random();
    const txs = [
      randomAccountTx({ accountPublicKey: accountPubKey0, aliasHash: aliasHash0, nonce: 1 }),
      randomAccountTx({ accountPublicKey: accountPubKey1, aliasHash: aliasHash0, nonce: 3 }),
      randomAccountTx({ accountPublicKey: accountPubKey1, aliasHash: aliasHash1, nonce: 2 }),
    ];
    for (const tx of txs) {
      await rollupDb.addTx(tx);
    }

    expect(await rollupDb.getAccountId(aliasHash0)).toEqual(new AccountId(accountPubKey1, 3));
    expect(await rollupDb.getAccountId(aliasHash0, 0)).toEqual(new AccountId(accountPubKey0, 0));
    expect(await rollupDb.getAccountId(aliasHash0, 1)).toEqual(new AccountId(accountPubKey0, 1));
    expect(await rollupDb.getAccountId(aliasHash0, 2)).toEqual(new AccountId(accountPubKey1, 2));
    expect(await rollupDb.getAccountId(aliasHash0, 3)).toEqual(new AccountId(accountPubKey1, 3));
    expect(await rollupDb.getAccountId(aliasHash0, 4)).toBe(undefined);

    expect(await rollupDb.getAccountId(aliasHash1)).toEqual(new AccountId(accountPubKey1, 2));
  });

  it('should update existing rollup', async () => {
    const tx0 = randomTx();
    const tx1 = randomTx();

    {
      const rollupProof = randomRollupProof([tx0, tx1], 0);
      const rollup = randomRollup(0, rollupProof);

      await rollupDb.addRollup(rollup);

      const newRollup = (await rollupDb.getRollup(0))!;
      expect(newRollup).toStrictEqual(rollup);
    }

    {
      const rollupProof = randomRollupProof([tx0, tx1], 0);
      const rollup = randomRollup(0, rollupProof);

      await rollupDb.addRollup(rollup);

      const newRollup = (await rollupDb.getRollup(0))!;
      expect(newRollup).toStrictEqual(rollup);
    }
  });

  it('should get settled txs', async () => {
    const tx0 = randomTx();
    const tx1 = randomTx();
    const rollupProof = randomRollupProof([tx0, tx1], 0);
    const rollup = randomRollup(0, rollupProof);

    await rollupDb.addRollup(rollup);

    const settledRollups1 = await rollupDb.getSettledRollups();
    expect(settledRollups1.length).toBe(0);

    await rollupDb.confirmMined(rollup.id, 0, 0n, new Date(), TxHash.random(), [], [tx0.id, tx1.id], []);

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

    await rollupDb.confirmMined(rollup.id, 0, 0n, new Date(), TxHash.random(), [], [tx0.id], []);

    expect(await rollupDb.getUnsettledTxCount()).toBe(0);
  });

  it('should get unsettled txs', async () => {
    const tx0 = randomTx();
    const tx1 = randomTx();
    const tx2 = randomTx();
    await rollupDb.addTx(tx0);
    await rollupDb.addTx(tx1);
    await rollupDb.addTx(tx2);

    const rollupProof0 = randomRollupProof([tx0], 0);
    const rollup0 = randomRollup(0, rollupProof0);
    const rollupProof1 = randomRollupProof([tx1], 1);
    const rollup1 = randomRollup(1, rollupProof1);

    await rollupDb.addRollup(rollup0);
    await rollupDb.addRollup(rollup1);

    await rollupDb.confirmMined(rollup0.id, 0, 0n, new Date(), TxHash.random(), [], [tx0.id], []);

    const unsettledTxs = await rollupDb.getUnsettledTxs();
    expect(unsettledTxs.length).toBe(2);
    expect(unsettledTxs.map(tx => tx.id)).toEqual(expect.arrayContaining([tx1.id, tx2.id]));
  });

  it('should get unsettled js txs', async () => {
    const txs = [
      TxType.DEFI_CLAIM,
      TxType.WITHDRAW_TO_WALLET,
      TxType.DEPOSIT,
      TxType.ACCOUNT,
      TxType.WITHDRAW_TO_CONTRACT,
      TxType.DEFI_DEPOSIT,
      TxType.TRANSFER,
    ].map(txType => randomTx({ txType }));
    for (const tx of txs) {
      await rollupDb.addTx(tx);
    }

    const result = await rollupDb.getUnsettledPaymentTxs();
    expect(result.length).toBe(4);
    expect(result.map(r => r.txType)).toEqual(
      expect.arrayContaining([TxType.DEPOSIT, TxType.TRANSFER, TxType.WITHDRAW_TO_CONTRACT, TxType.WITHDRAW_TO_WALLET]),
    );
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

  it('should add and get pending claims', async () => {
    const pendingClaims: ClaimDao[] = [];
    for (let i = 0; i < 16; ++i) {
      const claim = randomClaim();
      claim.interactionNonce = i % 2; // nonce is based on even or odd-ness
      if (i % 4 === 0) {
        // every 4th is fully claimed
        claim.claimed = new Date();
        claim.interactionResultRollupId = (claim.interactionNonce + 1) * 32;
      } else {
        // every odd is not ready for claim
        if (i % 2 === 0) {
          claim.interactionResultRollupId = (claim.interactionNonce + 1) * 32;
        }
        pendingClaims.push(claim);
      }
      await rollupDb.addClaim(claim);
    }

    // only those pending claims with a valid result are ready to rollup
    expect(await rollupDb.getClaimsToRollup()).toEqual(pendingClaims.filter(claim => claim.interactionResultRollupId));

    pendingClaims.forEach(claim => {
      if (claim.interactionResultRollupId) {
        return;
      }
      claim.interactionResultRollupId = (claim.interactionNonce + 1) * 32;
    });

    // now set the odds to be ready to rollup
    await rollupDb.updateClaimsWithResultRollupId(1, 64);

    // now, all claims in pending claims should be ready to rollup
    expect(await rollupDb.getClaimsToRollup()).toEqual(pendingClaims);

    // now confirm the first claim
    await rollupDb.confirmClaimed(pendingClaims[0].nullifier, new Date());

    // should no longer be ready to rollup
    expect(await rollupDb.getClaimsToRollup()).toEqual(pendingClaims.slice(1));
  });

  it('should delete unsettled claim txs', async () => {
    const claimedTxs: TxDao[] = [];
    const unclaimedTxs: TxDao[] = [];
    for (let i = 0; i < 8; ++i) {
      const claim = randomClaim();
      const tx = randomTx();
      tx.nullifier1 = claim.nullifier;
      if (i % 2) {
        tx.mined = new Date();
        claim.claimed = tx.mined;
        claimedTxs.push(tx);
      } else {
        unclaimedTxs.push(tx);
      }
      await rollupDb.addClaim(claim);
      await rollupDb.addTx(tx);
    }

    const txs = await rollupDb.getPendingTxs();
    expect(txs).toEqual(
      [...claimedTxs, ...unclaimedTxs].sort((a, b) => (a.created.getTime() > b.created.getTime() ? 1 : -1)),
    );

    await rollupDb.deleteUnsettledClaimTxs();

    const saved = await rollupDb.getPendingTxs();
    expect(saved).toEqual(claimedTxs.sort((a, b) => (a.created.getTime() > b.created.getTime() ? 1 : -1)));
  });

  it('should delete txs by id', async () => {
    const txs = Array.from({ length: 20 }).map(() => randomTx());
    for (const tx of txs) {
      await rollupDb.addTx(tx);
    }
    const pendingTxs = await rollupDb.getPendingTxs();
    expect(pendingTxs).toEqual(txs.sort((a, b) => (a.created.getTime() > b.created.getTime() ? 1 : -1)));

    const idsToDelete = [txs[4], txs[7], txs[12], txs[15], txs[16], txs[19]].map(tx => tx.id);
    await rollupDb.deleteTxsById(idsToDelete);
    const newPendingTxs = await rollupDb.getPendingTxs();
    const expectedTxs = txs.filter(tx => !idsToDelete.some(id => tx.id.equals(id)));
    expect(newPendingTxs).toEqual(expectedTxs.sort((a, b) => (a.created.getTime() > b.created.getTime() ? 1 : -1)));
  });
});

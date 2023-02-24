import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { randomBytes } from '@aztec/barretenberg/crypto';
import { default as levelup } from 'levelup';
import { default as memdown } from 'memdown';
import { AuthAccountData, AuthDatabase } from './auth_database.js';

describe('caramel core sdk', () => {
  let db: AuthDatabase;
  const origin0 = 'test.com';
  const origin1 = 'test.com:1234';

  const randomAccount = (): AuthAccountData => ({
    accountPublicKey: GrumpkinAddress.random(),
    accountPrivateKey: randomBytes(32),
    assets: [1, 3, 4],
  });

  beforeEach(() => {
    const keyValueDb = levelup(memdown());
    db = new AuthDatabase(keyValueDb);
  });

  it('get, add, and remove accounts', async () => {
    const account0 = randomAccount();
    const account1 = randomAccount();

    expect(await db.getAccounts(origin0)).toEqual([]);

    await db.addAccount(origin0, account0);
    await db.removeAccount(origin0, account1.accountPublicKey);

    expect(await db.getAccounts(origin0)).toEqual([account0]);
    expect(await db.getAccount(origin0, account0.accountPublicKey)).toEqual(account0);
    expect(await db.getAccount(origin0, account1.accountPublicKey)).toBe(undefined);

    await db.addAccount(origin0, account1);

    expect(await db.getAccounts(origin0)).toEqual([account0, account1]);
    expect(await db.getAccount(origin0, account0.accountPublicKey)).toEqual(account0);
    expect(await db.getAccount(origin0, account1.accountPublicKey)).toEqual(account1);

    await db.removeAccount(origin0, account0.accountPublicKey);

    expect(await db.getAccounts(origin0)).toEqual([account1]);
    expect(await db.getAccount(origin0, account0.accountPublicKey)).toBe(undefined);
    expect(await db.getAccount(origin0, account1.accountPublicKey)).toEqual(account1);
  });

  it('override existing account', async () => {
    const account0 = randomAccount();
    const account1 = randomAccount();

    await db.addAccount(origin0, account0);
    await db.addAccount(origin0, account1);

    expect(await db.getAccounts(origin0)).toEqual([account0, account1]);

    const updatedAccount1 = { ...account1, assets: [1, 2] };

    await db.addAccount(origin0, updatedAccount1);

    expect(await db.getAccounts(origin0)).toEqual([account0, updatedAccount1]);

    const updatedAccount0 = { ...account0, accountPrivateKey: randomBytes(32) };

    await db.addAccount(origin0, updatedAccount0);

    expect(await db.getAccounts(origin0)).toEqual([updatedAccount1, updatedAccount0]);
  });

  it('process accounts for different origins', async () => {
    const account0 = randomAccount();
    const account1 = randomAccount();

    await db.addAccount(origin0, account0);
    await db.addAccount(origin1, account1);

    expect(await db.getAccounts(origin0)).toEqual([account0]);
    expect(await db.getAccounts(origin1)).toEqual([account1]);

    await db.removeAccount(origin0, account0.accountPublicKey);
    await db.removeAccount(origin1, account0.accountPublicKey);

    expect(await db.getAccounts(origin0)).toEqual([]);
    expect(await db.getAccounts(origin1)).toEqual([account1]);
  });
});

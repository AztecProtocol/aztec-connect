import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { randomBytes } from 'crypto';
import levelup, { LevelUp } from 'levelup';
import memdown from 'memdown';
import { CoreSdkServerStub } from '../../core_sdk/core_sdk_server_stub';
import { CaramelCoreSdk } from './caramel_core_sdk';

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

describe('caramel core sdk', () => {
  let db: LevelUp;
  let core: Mockify<CoreSdkServerStub>;
  let sdk: CaramelCoreSdk;
  const origin = 'test.xyz';
  const users = [...new Array(2)].map(() => ({
    id: GrumpkinAddress.random().toString(),
    accountPrivateKey: new Uint8Array(randomBytes(32)),
  }));

  beforeEach(() => {
    db = levelup(memdown());

    core = {
      on: jest.fn(),
      addUser: jest
        .fn()
        .mockImplementation(accountPrivateKey =>
          users.find(u => u.accountPrivateKey.toString() === accountPrivateKey.toString()),
        ),
      removeUser: jest.fn(),
      userExists: jest.fn().mockResolvedValue(true),
      derivePublicKey: jest.fn().mockImplementation(privateKey => {
        const user = users.find(u => u.accountPrivateKey.toString() === privateKey.toString());
        return user?.id || GrumpkinAddress.random().toString();
      }),
      getUserData: jest.fn().mockImplementation(userId => users.find(u => u.id === userId)),
      getBalance: jest.fn().mockResolvedValue('0'),
    } as any;

    sdk = new CaramelCoreSdk(core as any, origin, db);
  });

  it('user will be added and removed for specific origin', async () => {
    const origin1 = 'one.xyz';
    const sdk1 = new CaramelCoreSdk(core as any, origin1, db);

    await sdk.addUser(users[0].accountPrivateKey);

    expect(await sdk.userExists(users[0].id)).toBe(true);
    expect(await sdk1.userExists(users[0].id)).toBe(false);

    await sdk1.addUser(users[0].accountPrivateKey);

    expect(await sdk.userExists(users[0].id)).toBe(true);
    expect(await sdk1.userExists(users[0].id)).toBe(true);

    await sdk.removeUser(users[0].id);

    expect(await sdk.userExists(users[0].id)).toBe(false);
    expect(await sdk1.userExists(users[0].id)).toBe(true);
  });

  it('user will be added when core.addUser throws but user exists in core sdk', async () => {
    core.addUser.mockRejectedValue(new Error('addUser error'));

    await sdk.addUser(users[0].accountPrivateKey);

    expect(await sdk.userExists(users[0].id)).toBe(true);
  });

  it('user will not be added when core.addUser throws and user does not exist in core sdk', async () => {
    core.addUser.mockRejectedValue(new Error('addUser error'));
    core.getUserData.mockRejectedValue(new Error('getUserData error'));

    await expect(sdk.addUser(users[0].accountPrivateKey)).rejects.toThrow('addUser error');

    expect(await sdk.userExists(users[0].id)).toBe(false);
  });

  it('will remove user from core sdk only when no domain requires it', async () => {
    const origin1 = 'one.xyz';
    const sdk1 = new CaramelCoreSdk(core as any, origin1, db);

    const origin2 = 'two.xyz';
    const sdk2 = new CaramelCoreSdk(core as any, origin2, db);

    await sdk.addUser(users[0].accountPrivateKey);
    await sdk1.addUser(users[0].accountPrivateKey);
    await sdk2.addUser(users[0].accountPrivateKey);

    await sdk.removeUser(users[0].id);

    expect(core.removeUser).toHaveBeenCalledTimes(0);

    await sdk2.removeUser(users[0].id);

    expect(core.removeUser).toHaveBeenCalledTimes(0);

    await sdk1.removeUser(users[0].id);

    expect(core.removeUser).toHaveBeenCalledTimes(1);
  });

  it('can call getBalance after the user has been added', async () => {
    core.getBalance.mockResolvedValue('123');

    await expect(sdk.getBalance(users[0].id, 0)).rejects.toThrow();
    await expect(sdk.getBalance(users[1].id, 0)).rejects.toThrow();

    await sdk.addUser(users[0].accountPrivateKey);

    expect(await sdk.getBalance(users[0].id, 0)).toBe('123');
    await expect(sdk.getBalance(users[1].id, 0)).rejects.toThrow();
  });
});

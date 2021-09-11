import { randomBytes } from 'crypto';
import { AccountAliasId } from '../account_id';
import { GrumpkinAddress } from '../address';
import { OffchainAccountData } from './offchain_account_data';

describe('OffchainAccountData', () => {
  it('convert offchain account data to and from buffer', () => {
    const userData = new OffchainAccountData(
      GrumpkinAddress.randomAddress(),
      AccountAliasId.random(),
      randomBytes(32),
      randomBytes(32),
    );
    const buf = userData.toBuffer();
    expect(buf.length).toBe(OffchainAccountData.SIZE);
    expect(OffchainAccountData.fromBuffer(buf)).toEqual(userData);
  });

  it('both spending keys are optional', () => {
    [
      [undefined, randomBytes(32)],
      [randomBytes(32), undefined],
      [undefined, undefined],
    ].forEach(([key1, key2]) => {
      const userData = new OffchainAccountData(GrumpkinAddress.randomAddress(), AccountAliasId.random(), key1, key2);
      const buf = userData.toBuffer();
      expect(buf.length).toBe(OffchainAccountData.SIZE);
      expect(OffchainAccountData.fromBuffer(buf)).toEqual(userData);
    });
  });

  it('throw if spending key is not 32 bytes', () => {
    expect(
      () =>
        new OffchainAccountData(
          GrumpkinAddress.randomAddress(),
          AccountAliasId.random(),
          randomBytes(33),
          randomBytes(32),
        ),
    ).toThrow();
    expect(
      () =>
        new OffchainAccountData(
          GrumpkinAddress.randomAddress(),
          AccountAliasId.random(),
          randomBytes(32),
          randomBytes(31),
        ),
    ).toThrow();
  });
});

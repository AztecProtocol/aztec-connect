import { randomBytes } from 'crypto';
import { AliasHash } from '../account_id';
import { GrumpkinAddress } from '../address';
import { OffchainAccountData } from './offchain_account_data';

describe('OffchainAccountData', () => {
  it('convert offchain account data to and from buffer', () => {
    const userData = new OffchainAccountData(
      GrumpkinAddress.random(),
      AliasHash.random(),
      randomBytes(32),
      randomBytes(32),
      123,
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
      const userData = new OffchainAccountData(GrumpkinAddress.random(), AliasHash.random(), key1, key2, 123);
      const buf = userData.toBuffer();
      expect(buf.length).toBe(OffchainAccountData.SIZE);
      expect(OffchainAccountData.fromBuffer(buf)).toEqual(userData);
    });
  });

  it('throw if spending key is not 32 bytes', () => {
    expect(
      () => new OffchainAccountData(GrumpkinAddress.random(), AliasHash.random(), randomBytes(33), randomBytes(32)),
    ).toThrow();
    expect(
      () => new OffchainAccountData(GrumpkinAddress.random(), AliasHash.random(), randomBytes(32), randomBytes(31)),
    ).toThrow();
  });

  it('throw if buffer size is wrong', () => {
    expect(() => OffchainAccountData.fromBuffer(randomBytes(OffchainAccountData.SIZE - 1))).toThrow();
    expect(() => OffchainAccountData.fromBuffer(randomBytes(OffchainAccountData.SIZE + 1))).toThrow();
  });
});

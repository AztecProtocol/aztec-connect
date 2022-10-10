import { randomBytes } from '../crypto/index.js';
import { ViewingKey } from '../viewing_key/index.js';
import { OffchainJoinSplitData } from './offchain_join_split_data.js';

describe('OffchainJoinSplitData', () => {
  it('convert offchain join split data to and from buffer', () => {
    const userData = new OffchainJoinSplitData([ViewingKey.random(), ViewingKey.random()], 123);
    const buf = userData.toBuffer();
    expect(buf.length).toBe(OffchainJoinSplitData.SIZE);
    expect(OffchainJoinSplitData.fromBuffer(buf)).toEqual(userData);
  });

  it('throw if number of viewing keys is wrong', () => {
    expect(() => new OffchainJoinSplitData([], 123)).toThrow();
    expect(
      () => new OffchainJoinSplitData([ViewingKey.random(), ViewingKey.random(), ViewingKey.random()], 123),
    ).toThrow();
  });

  it('throw if at least one of the viewing keys is empty', () => {
    expect(() => new OffchainJoinSplitData([ViewingKey.EMPTY, ViewingKey.random()], 123)).toThrow();
    expect(() => new OffchainJoinSplitData([ViewingKey.random(), ViewingKey.EMPTY], 123)).toThrow();
    expect(() => new OffchainJoinSplitData([ViewingKey.EMPTY, ViewingKey.EMPTY], 123)).toThrow();
  });

  it('throw if buffer size is wrong', () => {
    expect(() => OffchainJoinSplitData.fromBuffer(randomBytes(OffchainJoinSplitData.SIZE - 1))).toThrow();
    expect(() => OffchainJoinSplitData.fromBuffer(randomBytes(OffchainJoinSplitData.SIZE + 1))).toThrow();
  });
});

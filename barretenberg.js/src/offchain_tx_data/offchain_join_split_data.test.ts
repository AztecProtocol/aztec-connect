import { ViewingKey } from '../viewing_key';
import { OffchainJoinSplitData } from './offchain_join_split_data';

describe('OffchainJoinSplitData', () => {
  it('convert offchain join split data to and from buffer', () => {
    const userData = new OffchainJoinSplitData([ViewingKey.random(), ViewingKey.random()]);
    const buf = userData.toBuffer();
    expect(buf.length).toBe(OffchainJoinSplitData.SIZE);
    expect(OffchainJoinSplitData.fromBuffer(buf)).toEqual(userData);
  });

  it('throw if number of viewing keys is wrong', () => {
    expect(() => new OffchainJoinSplitData([])).toThrow();
    expect(() => new OffchainJoinSplitData([ViewingKey.random(), ViewingKey.random(), ViewingKey.random()])).toThrow();
  });
});

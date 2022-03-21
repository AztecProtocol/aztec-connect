import { randomBytes } from 'crypto';
import { Block } from '.';
import { TxHash } from '../blockchain';
import { Deserializer, serializeBufferArrayToVector } from '../serialize';

describe('block tests', () => {
  it('should serialize and deserialize block', () => {
    const block = new Block(
      new TxHash(randomBytes(32)),
      new Date(),
      1,
      2,
      randomBytes(123),
      [],
      [],
      789,
      BigInt(101112),
    );
    const buf = block.toBuffer();
    const block2 = Block.fromBuffer(buf);
    expect(block2).toEqual(block);
  });

  it('should serialize and deserialize block array', () => {
    const block = new Block(
      new TxHash(randomBytes(32)),
      new Date(),
      1,
      2,
      randomBytes(123),
      [],
      [],
      789,
      BigInt(101112),
    );
    const arr = [block, block, block];
    const buf = serializeBufferArrayToVector(arr.map(b => b.toBuffer()));
    const des = new Deserializer(buf);
    const arr2 = des.deserializeArray(Block.deserialize);
    expect(arr2).toEqual(arr);
  });
});

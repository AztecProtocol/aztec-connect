import { Block } from '@aztec/barretenberg/block_source';
import { Deserializer } from '@aztec/barretenberg/serialize';

export const deserializeBlocks = (buf: Buffer) => {
  const des = new Deserializer(buf);
  des.int32();
  return des.deserializeArray(Block.deserialize);
};

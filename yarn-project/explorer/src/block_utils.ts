import { Block } from '@aztec/barretenberg/block_source';
import { Deserializer } from '@aztec/barretenberg/serialize';

export const deserializeBlocks = (buf: Buffer) => {
  const des = new Deserializer(buf);
  return des.deserializeArray(Block.deserialize);
};

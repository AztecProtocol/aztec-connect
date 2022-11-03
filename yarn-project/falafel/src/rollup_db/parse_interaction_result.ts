import { DefiInteractionEvent } from '@aztec/barretenberg/block_source';
import { Deserializer } from '@aztec/barretenberg/serialize';

export const parseInteractionResult = (buf: Buffer) => {
  if (!buf.length) {
    return [];
  }
  const des = new Deserializer(buf);
  return des.deserializeArray(DefiInteractionEvent.deserialize);
};

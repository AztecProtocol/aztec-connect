import { numToUInt32BE } from '@aztec/barretenberg/serialize';

export enum Command {
  REQUEST_WORK,
  NO_WORK,
  GET_JOIN_SPLIT_VK,
  GET_ACCOUNT_VK,
  CREATE_PROOF,
  ACK,
  NACK,
}

/**
 * Message protocol between job server and worker.
 */
export class Protocol {
  static pack(id: Buffer, cmd: Command, data?: Buffer) {
    const buf = Buffer.concat([id, numToUInt32BE(cmd), data ?? Buffer.alloc(0)]);
    return buf;
  }

  static unpack(buf: Buffer) {
    const id = buf.slice(0, 32);
    const cmd = buf.readUInt32BE(32);
    const data = buf.slice(32 + 4);
    return { id, cmd, data };
  }

  static logUnpack(buf: Buffer) {
    const id = buf.slice(0, 32).toString('hex');
    const cmd = buf.readUInt32BE(32);
    const data = buf.slice(32 + 4).toString('hex');
    return { id, cmd, data };
  }
}

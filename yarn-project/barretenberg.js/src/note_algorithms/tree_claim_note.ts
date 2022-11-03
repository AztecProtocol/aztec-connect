import { toBigIntBE, toBufferBE } from '../bigint_buffer/index.js';
import { BridgeCallData } from '../bridge_call_data/index.js';
import { randomBytes } from '../crypto/index.js';
import { numToUInt32BE } from '../serialize/index.js';

export class TreeClaimNote {
  static EMPTY = new TreeClaimNote(BigInt(0), BridgeCallData.ZERO, 0, BigInt(0), Buffer.alloc(32), Buffer.alloc(32));
  static LENGTH = TreeClaimNote.EMPTY.toBuffer().length;

  constructor(
    public value: bigint,
    public bridgeCallData: BridgeCallData,
    public defiInteractionNonce: number,
    public fee: bigint,
    public partialState: Buffer,
    public inputNullifier: Buffer,
  ) {}

  static random() {
    return new TreeClaimNote(
      toBigIntBE(randomBytes(32)),
      BridgeCallData.random(),
      randomBytes(4).readUInt32BE(0),
      toBigIntBE(randomBytes(32)),
      randomBytes(32),
      randomBytes(32),
    );
  }

  static deserialize(buf: Buffer, offset: number) {
    return {
      elem: TreeClaimNote.fromBuffer(buf.slice(offset, offset + TreeClaimNote.LENGTH)),
      adv: TreeClaimNote.LENGTH,
    };
  }

  static fromBuffer(buf: Buffer) {
    const value = toBigIntBE(buf.slice(0, 32));
    let offset = 32;
    const bridgeCallData = BridgeCallData.fromBuffer(
      buf.slice(offset, offset + BridgeCallData.ENCODED_LENGTH_IN_BYTES),
    );
    offset += 32;
    const defiInteractionNonce = buf.readUInt32BE(offset);
    offset += 4;
    const fee = toBigIntBE(buf.slice(offset, offset + 32));
    offset += 32;
    const partialState = buf.slice(offset, offset + 32);
    offset += 32;
    const inputNullifier = buf.slice(offset, offset + 32);
    return new TreeClaimNote(value, bridgeCallData, defiInteractionNonce, fee, partialState, inputNullifier);
  }

  toBuffer() {
    return Buffer.concat([
      toBufferBE(this.value, 32),
      this.bridgeCallData.toBuffer(),
      numToUInt32BE(this.defiInteractionNonce),
      toBufferBE(this.fee, 32),
      this.partialState,
      this.inputNullifier,
    ]);
  }

  equals(note: TreeClaimNote) {
    return this.toBuffer().equals(note.toBuffer());
  }
}

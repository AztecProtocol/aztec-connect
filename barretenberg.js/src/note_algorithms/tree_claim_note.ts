import { toBigIntBE, toBufferBE } from '../bigint_buffer';
import { BridgeId } from '../bridge_id';
import { randomBytes } from '../crypto';
import { numToUInt32BE } from '../serialize';

export class TreeClaimNote {
  static EMPTY = new TreeClaimNote(BigInt(0), BridgeId.ZERO, 0, BigInt(0), Buffer.alloc(32), Buffer.alloc(32));
  static LENGTH = TreeClaimNote.EMPTY.toBuffer().length;

  constructor(
    public value: bigint,
    public bridgeId: BridgeId,
    public defiInteractionNonce: number,
    public fee: bigint,
    public partialState: Buffer,
    public inputNullifier: Buffer,
  ) {}

  static random() {
    return new TreeClaimNote(
      toBigIntBE(randomBytes(32)),
      BridgeId.random(),
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
    const bridgeId = BridgeId.fromBuffer(buf.slice(offset, offset + BridgeId.ENCODED_LENGTH_IN_BYTES));
    offset += 32;
    const defiInteractionNonce = buf.readUInt32BE(offset);
    offset += 4;
    const fee = toBigIntBE(buf.slice(offset, offset + 32));
    offset += 32;
    const partialState = buf.slice(offset, offset + 32);
    offset += 32;
    const inputNullifier = buf.slice(offset, offset + 32);
    return new TreeClaimNote(value, bridgeId, defiInteractionNonce, fee, partialState, inputNullifier);
  }

  toBuffer() {
    return Buffer.concat([
      toBufferBE(this.value, 32),
      this.bridgeId.toBuffer(),
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

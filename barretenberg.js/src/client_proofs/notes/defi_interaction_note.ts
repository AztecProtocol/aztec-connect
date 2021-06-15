import { toBigIntBE, toBufferBE } from 'bigint-buffer';
import { createHash, randomBytes } from 'crypto';
import { numToUInt32BE } from '../../serialize';
import { BridgeId } from '../bridge_id';

export class DefiInteractionNote {
  static LENGTH = 133;
  static EMPTY = new DefiInteractionNote(BridgeId.ZERO, 0, BigInt(0), BigInt(0), BigInt(0), false);

  constructor(
    public readonly bridgeId: BridgeId,
    public readonly nonce: number,
    public readonly totalInputValue: bigint,
    public readonly totalOutputValueA: bigint,
    public readonly totalOutputValueB: bigint,
    public readonly result: boolean,
  ) {}

  static random() {
    return new DefiInteractionNote(
      BridgeId.random(),
      randomBytes(4).readUInt32BE(),
      toBigIntBE(randomBytes(32)),
      toBigIntBE(randomBytes(32)),
      toBigIntBE(randomBytes(32)),
      !!Math.round(Math.random()),
    );
  }

  static fromBuffer(buf: Buffer) {
    const bridgeId = BridgeId.fromBuffer(buf.slice(0, 32));
    let offset = 32;
    const nonce = buf.readUInt32BE(offset);
    offset += 4;
    const totalInputValue = toBigIntBE(buf.slice(offset, offset + 32));
    offset += 32;
    const totalOutputValueA = toBigIntBE(buf.slice(offset, offset + 32));
    offset += 32;
    const totalOutputValueB = toBigIntBE(buf.slice(offset, offset + 32));
    offset += 32;
    const result = !!buf[offset];
    return new DefiInteractionNote(bridgeId, nonce, totalInputValue, totalOutputValueA, totalOutputValueB, result);
  }

  toBuffer() {
    return Buffer.concat([
      this.bridgeId.toBuffer(),
      numToUInt32BE(this.nonce),
      toBufferBE(this.totalInputValue, 32),
      toBufferBE(this.totalOutputValueA, 32),
      toBufferBE(this.totalOutputValueB, 32),
      Buffer.from([+this.result]),
    ]);
  }

  equals(note: DefiInteractionNote) {
    return this.toBuffer().equals(note.toBuffer());
  }
}

export const packInteractionNotes = (notes: DefiInteractionNote[]) =>
  createHash('sha256')
    .update(
      Buffer.concat(
        notes.map(note =>
          Buffer.concat([
            note.bridgeId.toBuffer(),
            numToUInt32BE(note.nonce, 32),
            toBufferBE(note.totalInputValue, 32),
            toBufferBE(note.totalOutputValueA, 32),
            toBufferBE(note.totalOutputValueB, 32),
            Buffer.alloc(31),
            Buffer.from([+note.result]),
          ]),
        ),
      ),
    )
    .digest();

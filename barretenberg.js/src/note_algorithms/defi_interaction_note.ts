import { toBigIntBE, toBufferBE } from '../bigint_buffer';
import { createHash, randomBytes } from 'crypto';
import { numToUInt32BE } from '../serialize';
import { BridgeId } from '../bridge_id';

export class DefiInteractionNote {
  static EMPTY = new DefiInteractionNote(BridgeId.ZERO, 0, BigInt(0), BigInt(0), BigInt(0), false);
  static LENGTH = DefiInteractionNote.EMPTY.toBuffer().length;
  static groupModulus = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

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
    const totalInputValue = toBigIntBE(buf.slice(offset, offset + 32));
    offset += 32;
    const totalOutputValueA = toBigIntBE(buf.slice(offset, offset + 32));
    offset += 32;
    const totalOutputValueB = toBigIntBE(buf.slice(offset, offset + 32));
    offset += 32;
    const nonce = buf.readUInt32BE(offset);
    offset += 4;
    const result = !!buf[offset];
    return new DefiInteractionNote(bridgeId, nonce, totalInputValue, totalOutputValueA, totalOutputValueB, result);
  }

  toBuffer() {
    return Buffer.concat([
      this.bridgeId.toBuffer(),
      toBufferBE(this.totalInputValue, 32),
      toBufferBE(this.totalOutputValueA, 32),
      toBufferBE(this.totalOutputValueB, 32),
      numToUInt32BE(this.nonce),
      Buffer.from([+this.result]),
    ]);
  }

  equals(note: DefiInteractionNote) {
    return this.toBuffer().equals(note.toBuffer());
  }
}

export const computeInteractionHashes = (notes: DefiInteractionNote[], padTo = notes.length) => {
  notes = [...notes, ...Array(padTo - notes.length).fill(DefiInteractionNote.EMPTY)];

  const hash = notes.map(note =>
    createHash('sha256')
      .update(
        Buffer.concat([
          note.bridgeId.toBuffer(),
          numToUInt32BE(note.nonce, 32),
          toBufferBE(note.totalInputValue, 32),
          toBufferBE(note.totalOutputValueA, 32),
          toBufferBE(note.totalOutputValueB, 32),
          Buffer.alloc(31),
          Buffer.from([+note.result]),
        ]),
      )
      .digest(),
  );

  return hash.map(h => toBufferBE(BigInt('0x' + h.toString('hex')) % DefiInteractionNote.groupModulus, 32));
};

export const packInteractionNotes = (notes: DefiInteractionNote[], padTo = notes.length) => {
  const hash = createHash('sha256')
    .update(Buffer.concat(computeInteractionHashes(notes, padTo)))
    .digest();

  return toBufferBE(BigInt('0x' + hash.toString('hex')) % DefiInteractionNote.groupModulus, 32);
};

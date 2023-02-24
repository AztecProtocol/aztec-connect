import { toBigIntBE, toBufferBE } from '../bigint_buffer/index.js';
import { BridgeCallData } from '../bridge_call_data/index.js';
import { randomBytes, sha256 } from '../crypto/index.js';
import { numToUInt32BE, Deserializer, Serializer } from '../serialize/index.js';

export class DefiInteractionNote {
  static EMPTY = new DefiInteractionNote(BridgeCallData.ZERO, 0, BigInt(0), BigInt(0), BigInt(0), false);
  static groupModulus = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

  constructor(
    public readonly bridgeCallData: BridgeCallData,
    public readonly nonce: number,
    public readonly totalInputValue: bigint,
    public readonly totalOutputValueA: bigint,
    public readonly totalOutputValueB: bigint,
    public readonly result: boolean,
  ) {}

  static deserialize(buffer: Buffer, offset: number) {
    const des = new Deserializer(buffer, offset);
    const bridgeCallDataBuffer = des.buffer(32);
    const bridgeCallData = BridgeCallData.fromBuffer(bridgeCallDataBuffer);
    const totalInputValue = des.bigInt();
    const totalOutputValueA = des.bigInt();
    const totalOutputValueB = des.bigInt();
    const nonce = des.uInt32();
    const result = des.bool();

    return {
      elem: new DefiInteractionNote(
        bridgeCallData,
        nonce,
        totalInputValue,
        totalOutputValueA,
        totalOutputValueB,
        result,
      ),
      adv: des.getOffset() - offset,
    };
  }

  static random() {
    return new DefiInteractionNote(
      BridgeCallData.random(),
      randomBytes(4).readUInt32BE(0),
      toBigIntBE(randomBytes(32)),
      toBigIntBE(randomBytes(32)),
      toBigIntBE(randomBytes(32)),
      !!Math.round(Math.random()),
    );
  }

  static fromBuffer(buf: Buffer) {
    return DefiInteractionNote.deserialize(buf, 0).elem;
  }

  toBuffer() {
    const serializer = new Serializer();
    serializer.buffer(this.bridgeCallData.toBuffer());
    serializer.bigInt(this.totalInputValue);
    serializer.bigInt(this.totalOutputValueA);
    serializer.bigInt(this.totalOutputValueB);
    serializer.uInt32(this.nonce);
    serializer.bool(this.result);
    return serializer.getBuffer();
  }

  equals(note: DefiInteractionNote) {
    return this.toBuffer().equals(note.toBuffer());
  }
}

export const computeInteractionHashes = (notes: DefiInteractionNote[], padTo = notes.length) => {
  notes = [...notes, ...Array(padTo - notes.length).fill(DefiInteractionNote.EMPTY)];

  const hash = notes.map(note =>
    sha256(
      Buffer.concat([
        note.bridgeCallData.toBuffer(),
        numToUInt32BE(note.nonce, 32),
        toBufferBE(note.totalInputValue, 32),
        toBufferBE(note.totalOutputValueA, 32),
        toBufferBE(note.totalOutputValueB, 32),
        Buffer.alloc(31),
        Buffer.from([+note.result]),
      ]),
    ),
  );

  return hash.map(h => toBufferBE(BigInt('0x' + h.toString('hex')) % DefiInteractionNote.groupModulus, 32));
};

export const packInteractionNotes = (notes: DefiInteractionNote[], padTo = notes.length) => {
  const hash = sha256(Buffer.concat(computeInteractionHashes(notes, padTo)));

  return toBufferBE(BigInt('0x' + hash.toString('hex')) % DefiInteractionNote.groupModulus, 32);
};

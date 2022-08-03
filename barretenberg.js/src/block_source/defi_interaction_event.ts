import { DefiInteractionNote } from '../note_algorithms';
import { toBigIntBE } from '../bigint_buffer';
import { BridgeCallData } from '../bridge_call_data';
import { randomBytes } from '../crypto';
import { Deserializer, Serializer } from '../serialize';

export class DefiInteractionEvent {
  static EMPTY = new DefiInteractionEvent(BridgeCallData.ZERO, 0, BigInt(0), BigInt(0), BigInt(0), false);

  constructor(
    public readonly bridgeCallData: BridgeCallData,
    public readonly nonce: number,
    public readonly totalInputValue: bigint,
    public readonly totalOutputValueA: bigint,
    public readonly totalOutputValueB: bigint,
    public readonly result: boolean,
    public readonly errorReason = Buffer.alloc(0),
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
    const errorReason = des.vector();

    return {
      elem: new DefiInteractionEvent(
        bridgeCallData,
        nonce,
        totalInputValue,
        totalOutputValueA,
        totalOutputValueB,
        result,
        errorReason,
      ),
      adv: des.getOffset() - offset,
    };
  }

  static random() {
    return new DefiInteractionEvent(
      BridgeCallData.random(),
      randomBytes(4).readUInt32BE(0),
      toBigIntBE(randomBytes(32)),
      toBigIntBE(randomBytes(32)),
      toBigIntBE(randomBytes(32)),
      !!Math.round(Math.random()),
    );
  }

  static fromBuffer(buf: Buffer) {
    return DefiInteractionEvent.deserialize(buf, 0).elem;
  }

  toBuffer() {
    const serializer = new Serializer();
    serializer.buffer(this.bridgeCallData.toBuffer());
    serializer.bigInt(this.totalInputValue);
    serializer.bigInt(this.totalOutputValueA);
    serializer.bigInt(this.totalOutputValueB);
    serializer.uInt32(this.nonce);
    serializer.bool(this.result);
    serializer.vector(this.errorReason);
    return serializer.getBuffer();
  }

  equals(note: DefiInteractionEvent) {
    return this.toBuffer().equals(note.toBuffer());
  }

  toDefiInteractionNote() {
    return new DefiInteractionNote(
      this.bridgeCallData,
      this.nonce,
      this.totalInputValue,
      this.totalOutputValueA,
      this.totalOutputValueB,
      this.result,
    );
  }
}

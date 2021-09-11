import { toBigIntBE, toBufferBE } from '../bigint_buffer';
import { BridgeId } from '../bridge_id';
import { ViewingKey } from '../viewing_key';

export class OffchainDefiDepositData {
  static SIZE = 4 * 32 + ViewingKey.SIZE;

  constructor(
    public readonly bridgeId: BridgeId,
    public readonly partialState: Buffer,
    public readonly depositValue: bigint,
    public readonly txFee: bigint,
    public readonly viewingKey: ViewingKey,
  ) {
    if (partialState.length !== 32) {
      throw new Error('Expect partialState to be 32 bytes.');
    }
  }

  static fromBuffer(buf: Buffer) {
    let dataStart = 0;
    const bridgeId = BridgeId.fromBuffer(buf.slice(dataStart, dataStart + 32));
    dataStart += 32;
    const partialState = buf.slice(dataStart, dataStart + 32);
    dataStart += 32;
    const depositValue = toBigIntBE(buf.slice(dataStart, dataStart + 32));
    dataStart += 32;
    const txFee = toBigIntBE(buf.slice(dataStart, dataStart + 32));
    dataStart += 32;
    const viewingKey = new ViewingKey(buf.slice(dataStart, dataStart + ViewingKey.SIZE));
    dataStart += ViewingKey.SIZE;
    return new OffchainDefiDepositData(bridgeId, partialState, depositValue, txFee, viewingKey);
  }

  toBuffer() {
    return Buffer.concat([
      this.bridgeId.toBuffer(),
      this.partialState,
      toBufferBE(this.depositValue, 32),
      toBufferBE(this.txFee, 32),
      this.viewingKey.toBuffer(),
    ]);
  }
}

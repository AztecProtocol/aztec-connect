import { GrumpkinAddress } from '../address';
import { toBigIntBE, toBufferBE } from '../bigint_buffer';
import { BridgeId } from '../bridge_id';
import { numToUInt32BE } from '../serialize';
import { ViewingKey } from '../viewing_key';

export class OffchainDefiDepositData {
  static EMPTY = new OffchainDefiDepositData(
    BridgeId.ZERO,
    Buffer.alloc(32),
    GrumpkinAddress.ZERO,
    BigInt(0),
    BigInt(0),
    new ViewingKey(Buffer.alloc(ViewingKey.SIZE)),
  );
  static SIZE = OffchainDefiDepositData.EMPTY.toBuffer().length;

  constructor(
    public readonly bridgeId: BridgeId,
    public readonly partialState: Buffer,
    public readonly partialStateSecretEphPubKey: GrumpkinAddress, // the public key from which the partial state's secret may be derived (when combined with a valid account private key).
    public readonly depositValue: bigint,
    public readonly txFee: bigint,
    public readonly viewingKey: ViewingKey, // viewing key for the 'change' note
    public readonly txRefNo = 0,
  ) {
    if (partialState.length !== 32) {
      throw new Error('Expect partialState to be 32 bytes.');
    }
    if (viewingKey.isEmpty()) {
      throw new Error('Viewing key cannot be empty.');
    }
  }

  static fromBuffer(buf: Buffer) {
    if (buf.length !== OffchainDefiDepositData.SIZE) {
      throw new Error('Invalid buffer size.');
    }

    let dataStart = 0;
    const bridgeId = BridgeId.fromBuffer(buf.slice(dataStart, dataStart + 32));
    dataStart += 32;
    const partialState = buf.slice(dataStart, dataStart + 32);
    dataStart += 32;
    const partialStateSecretEphPubKey = new GrumpkinAddress(buf.slice(dataStart, dataStart + 64));
    dataStart += 64;
    const depositValue = toBigIntBE(buf.slice(dataStart, dataStart + 32));
    dataStart += 32;
    const txFee = toBigIntBE(buf.slice(dataStart, dataStart + 32));
    dataStart += 32;
    const viewingKey = new ViewingKey(buf.slice(dataStart, dataStart + ViewingKey.SIZE));
    dataStart += ViewingKey.SIZE;
    const txRefNo = buf.readUInt32BE(dataStart);
    return new OffchainDefiDepositData(
      bridgeId,
      partialState,
      partialStateSecretEphPubKey,
      depositValue,
      txFee,
      viewingKey,
      txRefNo,
    );
  }

  toBuffer() {
    return Buffer.concat([
      this.bridgeId.toBuffer(),
      this.partialState,
      this.partialStateSecretEphPubKey.toBuffer(),
      toBufferBE(this.depositValue, 32),
      toBufferBE(this.txFee, 32),
      this.viewingKey.toBuffer(),
      numToUInt32BE(this.txRefNo),
    ]);
  }
}

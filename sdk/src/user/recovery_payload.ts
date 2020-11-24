import { GrumpkinAddress } from 'barretenberg/address';
import { Signature } from 'barretenberg/client_proofs/signature';
import { numToUInt32BE } from 'barretenberg/serialize';

export class RecoveryData {
  constructor(public nonce: number, public signature: Signature) {}

  static fromBuffer(data: Buffer) {
    const nonce = data.readUInt32BE(0);
    const signature = new Signature(data.slice(4, 68));
    return new RecoveryData(nonce, signature);
  }

  static fromString(data: string) {
    return RecoveryData.fromBuffer(Buffer.from(data.replace(/^0x/i, ''), 'hex'));
  }

  toBuffer() {
    return Buffer.concat([numToUInt32BE(this.nonce), this.signature.toBuffer()]);
  }

  toString() {
    return `0x${this.toBuffer().toString('hex')}`;
  }
}

export class RecoveryPayload {
  constructor(
    public trustedThirdPartyPublicKey: GrumpkinAddress,
    public recoveryPublicKey: GrumpkinAddress,
    public recoveryData: RecoveryData,
  ) {}

  static fromBuffer(data: Buffer) {
    const trustedThirdPartyPublicKey = new GrumpkinAddress(data.slice(0, 64));
    const recoveryPublicKey = new GrumpkinAddress(data.slice(64, 64 + 64));
    const recoveryData = RecoveryData.fromBuffer(data.slice(64 + 64));
    return new RecoveryPayload(trustedThirdPartyPublicKey, recoveryPublicKey, recoveryData);
  }

  static fromString(data: string) {
    return RecoveryPayload.fromBuffer(Buffer.from(data.replace(/^0x/i, ''), 'hex'));
  }

  toBuffer() {
    return Buffer.concat([
      this.trustedThirdPartyPublicKey.toBuffer(),
      this.recoveryPublicKey.toBuffer(),
      this.recoveryData.toBuffer(),
    ]);
  }

  toString() {
    return `0x${this.toBuffer().toString('hex')}`;
  }
}

import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { RecoveryData } from './recovery_data.js';

export class RecoveryPayload {
  constructor(
    public trustedThirdPartyPublicKey: GrumpkinAddress,
    public recoveryPublicKey: GrumpkinAddress,
    public recoveryData: RecoveryData,
  ) {}

  static fromBuffer(data: Buffer) {
    let dataStart = 0;
    const trustedThirdPartyPublicKey = new GrumpkinAddress(data.slice(dataStart, dataStart + GrumpkinAddress.SIZE));
    dataStart += GrumpkinAddress.SIZE;
    const recoveryPublicKey = new GrumpkinAddress(data.slice(dataStart, dataStart + GrumpkinAddress.SIZE));
    dataStart += GrumpkinAddress.SIZE;
    const recoveryData = RecoveryData.fromBuffer(data.slice(dataStart));
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

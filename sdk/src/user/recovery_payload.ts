import { GrumpkinAddress } from 'barretenberg/address';

export class RecoveryPayload {
  constructor(
    public trustedThirdPartyPublicKey: GrumpkinAddress,
    public recoveryPublicKey: GrumpkinAddress,
    public recoveryData: Buffer,
  ) {}

  static FromBuffer(data: Buffer) {
    const trustedThirdPartyPublicKey = new GrumpkinAddress(data.slice(0, 64));
    const recoveryPublicKey = new GrumpkinAddress(data.slice(64, 64 + 64));
    const recoveryData = data.slice(64 + 64);
    return new RecoveryPayload(trustedThirdPartyPublicKey, recoveryPublicKey, recoveryData);
  }

  toBuffer() {
    return Buffer.concat([
      this.trustedThirdPartyPublicKey.toBuffer(),
      this.recoveryPublicKey.toBuffer(),
      this.recoveryData,
    ]);
  }
}

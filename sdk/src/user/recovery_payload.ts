import { GrumpkinAddress } from 'barretenberg/address';
import { AccountId, Signature } from 'barretenberg/client_proofs';

export class RecoveryData {
  constructor(public accountId: AccountId, public signature: Signature) {}

  static fromBuffer(data: Buffer) {
    const accountId = AccountId.fromBuffer(data.slice(0, 32));
    const signature = new Signature(data.slice(32, 96));
    return new RecoveryData(accountId, signature);
  }

  static fromString(data: string) {
    return RecoveryData.fromBuffer(Buffer.from(data.replace(/^0x/i, ''), 'hex'));
  }

  toBuffer() {
    return Buffer.concat([this.accountId.toBuffer(), this.signature.toBuffer()]);
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

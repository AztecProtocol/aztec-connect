import { GrumpkinAddress } from 'barretenberg/address';
import { AccountAliasId } from 'barretenberg/client_proofs/account_alias_id';
import { Signature } from 'barretenberg/client_proofs/signature';

export class RecoveryData {
  constructor(public accountAliasId: AccountAliasId, public signature: Signature) {}

  static fromBuffer(data: Buffer) {
    const accountAliasId = AccountAliasId.fromBuffer(data.slice(0, 32));
    const signature = new Signature(data.slice(32, 96));
    return new RecoveryData(accountAliasId, signature);
  }

  static fromString(data: string) {
    return RecoveryData.fromBuffer(Buffer.from(data.replace(/^0x/i, ''), 'hex'));
  }

  toBuffer() {
    return Buffer.concat([this.accountAliasId.toBuffer(), this.signature.toBuffer()]);
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

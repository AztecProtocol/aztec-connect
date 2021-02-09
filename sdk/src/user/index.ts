import { GrumpkinAddress } from 'barretenberg/address';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { AccountId } from './account_id';

export * from 'barretenberg/client_proofs/account_alias_id';
export * from 'barretenberg/client_proofs/alias_hash';
export * from './recovery_payload';
export * from './account_id';

export interface UserData {
  id: AccountId;
  privateKey: Buffer;
  publicKey: GrumpkinAddress;
  nonce: number;
  alias?: string;
  syncedToRollup: number;
}

export class UserDataFactory {
  constructor(private grumpkin: Grumpkin) {}

  derivePublicKey(privateKey: Buffer) {
    return new GrumpkinAddress(this.grumpkin.mul(Grumpkin.one, privateKey));
  }

  async createUser(privateKey: Buffer, nonce: number, alias?: string): Promise<UserData> {
    const publicKey = this.derivePublicKey(privateKey);
    const id = new AccountId(publicKey, nonce);
    return { id, privateKey, publicKey, nonce, alias, syncedToRollup: -1 };
  }
}

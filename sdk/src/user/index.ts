import { GrumpkinAddress } from 'barretenberg/address';
import { AliasHash } from 'barretenberg/client_proofs/alias_hash';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { EthereumSigner } from '../signer';
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
  aliasHash?: AliasHash;
  syncedToRollup: number;
}

export const deriveGrumpkinPrivateKey = async (signer: EthereumSigner) => {
  return (await signer.signMessage(Buffer.from('Link Aztec account.'))).slice(0, 32);
};

export class UserDataFactory {
  constructor(private grumpkin: Grumpkin) {}

  derivePublicKey(privateKey: Buffer) {
    return new GrumpkinAddress(this.grumpkin.mul(Grumpkin.one, privateKey));
  }

  async createUser(privateKey: Buffer, nonce: number, aliasHash?: AliasHash): Promise<UserData> {
    const publicKey = this.derivePublicKey(privateKey);
    const id = new AccountId(publicKey, nonce);
    return { id, privateKey, publicKey, nonce, aliasHash, syncedToRollup: -1 };
  }
}

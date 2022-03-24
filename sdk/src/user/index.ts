import { AccountId, AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';

export * from './recovery_payload';

export interface UserData {
  id: AccountId;
  privateKey: Buffer;
  publicKey: GrumpkinAddress;
  nonce: number;
  aliasHash?: AliasHash;
  syncedToRollup: number;
}

export interface UserDataJson {
  id: string;
  privateKey: string;
  publicKey: string;
  nonce: number;
  aliasHash?: string;
  syncedToRollup: number;
}

export const userDataToJson = ({ id, privateKey, publicKey, aliasHash, ...rest }: UserData): UserDataJson => ({
  ...rest,
  id: id.toString(),
  privateKey: privateKey.toString('hex'),
  publicKey: publicKey.toString(),
  aliasHash: aliasHash ? aliasHash.toString() : undefined,
});

export const userDataFromJson = ({ id, privateKey, publicKey, aliasHash, ...rest }: UserDataJson): UserData => ({
  ...rest,
  id: AccountId.fromString(id),
  privateKey: Buffer.from(privateKey, 'hex'),
  publicKey: GrumpkinAddress.fromString(publicKey),
  aliasHash: aliasHash ? AliasHash.fromString(aliasHash) : undefined,
});

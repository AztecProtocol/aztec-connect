import { GrumpkinAddress } from '@aztec/barretenberg/address';

export * from './recovery_payload';

export interface UserData {
  id: GrumpkinAddress;
  accountPublicKey: GrumpkinAddress;
  accountPrivateKey: Buffer;
  syncedToRollup: number;
}

export interface UserDataJson {
  id: string;
  accountPublicKey: string;
  accountPrivateKey: string;
  syncedToRollup: number;
}

export const userDataToJson = ({ id, accountPublicKey, accountPrivateKey, ...rest }: UserData): UserDataJson => ({
  ...rest,
  id: id.toString(),
  accountPublicKey: accountPublicKey.toString(),
  accountPrivateKey: accountPrivateKey.toString('hex'),
});

export const userDataFromJson = ({ id, accountPublicKey, accountPrivateKey, ...rest }: UserDataJson): UserData => ({
  ...rest,
  id: GrumpkinAddress.fromString(id),
  accountPublicKey: GrumpkinAddress.fromString(accountPublicKey),
  accountPrivateKey: Buffer.from(accountPrivateKey, 'hex'),
});

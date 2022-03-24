import { AccountId } from '@aztec/barretenberg/account_id';

export interface Note {
  assetId: number;
  value: bigint;
  secret: Buffer;
  commitment: Buffer;
  nullifier: Buffer;
  nullified: boolean;
  owner: AccountId;
  creatorPubKey: Buffer; // x-coord of note creator public key. Optional, default value 0
  inputNullifier: Buffer;
  index: number;
  allowChain: boolean;
  pending: boolean;
}

export interface NoteJson {
  assetId: number;
  value: string;
  secret: string;
  commitment: string;
  nullifier: string;
  nullified: boolean;
  owner: string;
  creatorPubKey: string;
  inputNullifier: string;
  index: number;
  allowChain: boolean;
  pending: boolean;
}

export const noteToJson = ({
  value,
  secret,
  commitment,
  nullifier,
  owner,
  creatorPubKey,
  inputNullifier,
  ...rest
}: Note): NoteJson => ({
  ...rest,
  value: value.toString(),
  secret: secret.toString('hex'),
  commitment: commitment.toString('hex'),
  nullifier: nullifier.toString('hex'),
  owner: owner.toString(),
  creatorPubKey: creatorPubKey.toString('hex'),
  inputNullifier: inputNullifier.toString('hex'),
});

export const noteFromJson = ({
  value,
  secret,
  commitment,
  nullifier,
  owner,
  creatorPubKey,
  inputNullifier,
  ...rest
}: NoteJson): Note => ({
  ...rest,
  value: BigInt(value),
  secret: Buffer.from(secret, 'hex'),
  commitment: Buffer.from(commitment, 'hex'),
  nullifier: Buffer.from(nullifier, 'hex'),
  owner: AccountId.fromString(owner),
  creatorPubKey: Buffer.from(creatorPubKey, 'hex'),
  inputNullifier: Buffer.from(inputNullifier, 'hex'),
});

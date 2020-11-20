import { GrumpkinAddress } from 'barretenberg/address';
import { AliasHash } from 'barretenberg/client_proofs/alias_hash';
import { TxHash } from 'barretenberg/rollup_provider';
import { randomBytes } from 'crypto';
import { Note } from '../../note';
import { AccountId, UserData, UserId } from '../../user';
import { UserTx } from '../../user_tx';
import { Alias, SigningKey } from '../database';

export const randomInt = () => {
  return Math.floor(Math.random() * 2 ** 32);
};

export const randomNote = (): Note => ({
  index: randomInt(),
  assetId: randomInt(),
  value: BigInt(randomInt()),
  dataEntry: randomBytes(32),
  viewingKey: randomBytes(32),
  encrypted: randomBytes(32),
  nullifier: randomBytes(32),
  nullified: false,
  owner: UserId.random(),
});

export const randomUser = (): UserData => ({
  id: UserId.random(),
  privateKey: randomBytes(32),
  publicKey: GrumpkinAddress.randomAddress(),
  nonce: randomInt(),
  aliasHash: AliasHash.random(),
  syncedToRollup: randomInt(),
});

export const randomUserTx = (): UserTx => ({
  txHash: TxHash.random(),
  userId: UserId.random(),
  action: 'DEPOSIT',
  assetId: randomInt(),
  value: BigInt(randomInt()),
  settled: false,
  created: new Date(),
  recipient: randomBytes(32),
});

export const randomAccountId = () => new AccountId(AliasHash.random(), randomInt());

export const randomSigningKey = (): SigningKey => ({
  accountId: randomAccountId(),
  key: randomBytes(32),
  treeIndex: randomInt(),
  address: GrumpkinAddress.randomAddress(),
});

export const randomAlias = (): Alias => ({
  aliasHash: AliasHash.random(),
  address: GrumpkinAddress.randomAddress(),
  latestNonce: randomInt(),
});

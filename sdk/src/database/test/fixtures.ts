import { GrumpkinAddress } from 'barretenberg/address';
import { randomBytes } from 'crypto';
import { Note } from '../../note';
import { UserData } from '../../user';
import { UserTx } from '../../user_tx';
import { SigningKey } from '../database';

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
  owner: randomBytes(32),
});

export const randomUser = (): UserData => ({
  id: randomBytes(64),
  privateKey: randomBytes(32),
  publicKey: GrumpkinAddress.randomAddress(),
  syncedToRollup: randomInt(),
});

export const randomUserTx = (): UserTx => ({
  txHash: randomBytes(32),
  userId: randomBytes(32),
  action: 'DEPOSIT',
  assetId: randomInt(),
  value: BigInt(randomInt()),
  settled: false,
  created: new Date(),
  recipient: randomBytes(32),
});

export const randomSigningKey = (): SigningKey => ({
  owner: randomBytes(32),
  key: randomBytes(32),
  treeIndex: randomInt(),
});

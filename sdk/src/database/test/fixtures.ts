import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { AliasHash } from 'barretenberg/client_proofs/alias_hash';
import { TxHash } from 'barretenberg/rollup_provider';
import { ViewingKey } from 'barretenberg/viewing_key';
import { randomBytes } from 'crypto';
import { Note } from '../../note';
import { AccountAliasId, UserData, AccountId } from '../../user';
import { UserAccountTx, UserJoinSplitTx } from '../../user_tx';
import { Alias, SigningKey } from '../database';

export const randomInt = () => {
  return Math.floor(Math.random() * 2 ** 32);
};

export const randomNote = (): Note => ({
  index: randomInt(),
  assetId: randomInt(),
  value: BigInt(randomInt()),
  dataEntry: randomBytes(32),
  secret: randomBytes(32),
  viewingKey: ViewingKey.random(),
  nullifier: randomBytes(32),
  nullified: false,
  owner: AccountId.random(),
});

export const randomUser = (): UserData => ({
  id: AccountId.random(),
  privateKey: randomBytes(32),
  publicKey: GrumpkinAddress.randomAddress(),
  nonce: randomInt(),
  aliasHash: AliasHash.random(),
  syncedToRollup: randomInt(),
});

export const randomUserAccountTx = (): UserAccountTx => ({
  txHash: TxHash.random(),
  userId: AccountId.random(),
  aliasHash: AliasHash.random(),
  newSigningPubKey1: randomBytes(32),
  newSigningPubKey2: randomBytes(32),
  migrated: false,
  settled: false,
  created: new Date(),
});

export const randomUserJoinSplitTx = (): UserJoinSplitTx => ({
  txHash: TxHash.random(),
  userId: AccountId.random(),
  assetId: randomInt(),
  publicInput: BigInt(randomInt()),
  publicOutput: BigInt(randomInt()),
  privateInput: BigInt(randomInt()),
  recipientPrivateOutput: BigInt(randomInt()),
  senderPrivateOutput: BigInt(randomInt()),
  inputOwner: EthAddress.randomAddress(),
  outputOwner: EthAddress.randomAddress(),
  ownedByUser: true,
  settled: false,
  created: new Date(),
});

export const randomAccountAliasId = () => new AccountAliasId(AliasHash.random(), randomInt());

export const randomSigningKey = (): SigningKey => ({
  accountAliasId: randomAccountAliasId(),
  key: randomBytes(32),
  treeIndex: randomInt(),
  address: GrumpkinAddress.randomAddress(),
});

export const randomAlias = (): Alias => ({
  aliasHash: AliasHash.random(),
  address: GrumpkinAddress.randomAddress(),
  latestNonce: randomInt(),
});

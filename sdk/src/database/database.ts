import { GrumpkinAddress } from 'barretenberg/address';
import { AliasHash } from 'barretenberg/client_proofs/alias_hash';
import { TxHash } from 'barretenberg/rollup_provider';
import { Note } from '../note';
import { AccountId, UserData, UserId } from '../user';
import { UserTx } from '../user_tx';

export interface SigningKey {
  accountId: AccountId;
  address: GrumpkinAddress;
  treeIndex: number;
  key: Buffer;
}

export interface Alias {
  aliasHash: AliasHash;
  address: GrumpkinAddress;
  latestNonce: number;
}

export interface Database {
  close(): Promise<void>;
  clear(): Promise<void>;

  addNote(note: Note): Promise<void>;
  getNote(treeIndex: number): Promise<Note | undefined>;
  getNoteByNullifier(nullifier: Buffer): Promise<Note | undefined>;
  nullifyNote(index: number): Promise<void>;
  getUserNotes(userId: UserId): Promise<Note[]>;

  getUser(userId: UserId): Promise<UserData | undefined>;
  getUsers(): Promise<UserData[]>;
  addUser(user: UserData): Promise<void>;
  updateUser(user: UserData): Promise<void>;
  removeUser(userId: UserId): Promise<void>;
  resetUsers(): Promise<void>;

  getUserTx(userId: UserId, txHash: TxHash): Promise<UserTx | undefined>;
  getUserTxs(userId: UserId): Promise<UserTx[]>;
  getUserTxsByTxHash(txHash: TxHash): Promise<UserTx[]>;
  addUserTx(userTx: UserTx): Promise<void>;
  settleUserTx(userId: UserId, txHash: TxHash): Promise<void>;

  addUserSigningKey(signingKey: SigningKey): Promise<void>;
  getUserSigningKeys(accountId: AccountId): Promise<SigningKey[]>;
  getUserSigningKeyIndex(accountId: AccountId, signingKey: GrumpkinAddress): Promise<number | undefined>;
  removeUserSigningKeys(accountId: AccountId): Promise<void>;

  addAlias(alias: Alias): Promise<void>;
  updateAlias(alias: Alias): Promise<void>;
  getAlias(aliasHash: AliasHash, address: GrumpkinAddress): Promise<Alias | undefined>;
  getAliases(aliasHash: AliasHash): Promise<Alias[]>;
  getLatestNonceByAddress(address: GrumpkinAddress): Promise<number | undefined>;
  getLatestNonceByAliasHash(aliasHash: AliasHash): Promise<number | undefined>;
  getAliasHashByAddress(address: GrumpkinAddress, nonce?: number): Promise<AliasHash | undefined>;
  getAddressByAliasHash(aliasHash: AliasHash, nonce?: number): Promise<GrumpkinAddress | undefined>;

  deleteKey(name: string): Promise<void>;
  addKey(name: string, value: Buffer): Promise<void>;
  getKey(name: string): Promise<Buffer | undefined>;
}

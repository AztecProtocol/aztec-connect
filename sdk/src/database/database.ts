import { GrumpkinAddress } from 'barretenberg/address';
import { AliasHash } from 'barretenberg/client_proofs/alias_hash';
import { TxHash } from 'barretenberg/rollup_provider';
import { Note } from '../note';
import { AccountAliasId, UserData, AccountId } from '../user';
import { UserTx } from '../user_tx';

export interface SigningKey {
  accountAliasId: AccountAliasId;
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
  init(): Promise<void>;
  close(): Promise<void>;
  clear(): Promise<void>;

  addNote(note: Note): Promise<void>;
  getNote(treeIndex: number): Promise<Note | undefined>;
  getNoteByNullifier(nullifier: Buffer): Promise<Note | undefined>;
  nullifyNote(index: number): Promise<void>;
  getUserNotes(userId: AccountId): Promise<Note[]>;

  getUser(userId: AccountId): Promise<UserData | undefined>;
  getUsers(): Promise<UserData[]>;
  addUser(user: UserData): Promise<void>;
  updateUser(user: UserData): Promise<void>;
  removeUser(userId: AccountId): Promise<void>;
  resetUsers(): Promise<void>;

  getUserTx(userId: AccountId, txHash: TxHash): Promise<UserTx | undefined>;
  getUserTxs(userId: AccountId): Promise<UserTx[]>;
  getUserTxsByTxHash(txHash: TxHash): Promise<UserTx[]>;
  addUserTx(userTx: UserTx): Promise<void>;
  settleUserTx(userId: AccountId, txHash: TxHash): Promise<void>;

  addUserSigningKey(signingKey: SigningKey): Promise<void>;
  getUserSigningKeys(accountAliasId: AccountAliasId): Promise<SigningKey[]>;
  getUserSigningKeyIndex(accountAliasId: AccountAliasId, signingKey: GrumpkinAddress): Promise<number | undefined>;
  removeUserSigningKeys(accountAliasId: AccountAliasId): Promise<void>;

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

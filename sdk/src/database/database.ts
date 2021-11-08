import { GrumpkinAddress } from 'barretenberg/address';
import { AliasHash } from 'barretenberg/client_proofs/alias_hash';
import { TxHash } from 'barretenberg/tx_hash';
import { Note } from '../note';
import { UserData, AccountId } from '../user';
import { UserAccountTx, UserJoinSplitTx } from '../user_tx';

export interface SigningKey {
  accountId: AccountId;
  key: Buffer; // only contains x coordinate of a grumpkin address.
  treeIndex: number;
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

  addJoinSplitTx(tx: UserJoinSplitTx): Promise<void>;
  getJoinSplitTx(userId: AccountId, txHash: TxHash): Promise<UserJoinSplitTx | undefined>;
  getJoinSplitTxs(userId): Promise<UserJoinSplitTx[]>;
  getJoinSplitTxsByTxHash(txHash: TxHash): Promise<UserJoinSplitTx[]>;
  settleJoinSplitTx(txHash: TxHash, settled: Date): Promise<void>;

  addAccountTx(tx: UserAccountTx): Promise<void>;
  getAccountTx(txHash: TxHash): Promise<UserAccountTx | undefined>;
  getAccountTxs(userId): Promise<UserAccountTx[]>;
  settleAccountTx(txHash: TxHash, settled: Date): Promise<void>;

  getUnsettledUserTxs(userId: AccountId): Promise<TxHash[]>;
  removeUserTx(txHash: TxHash, userId: AccountId): Promise<void>;

  addUserSigningKey(signingKey: SigningKey): Promise<void>;
  getUserSigningKeys(accountId: AccountId): Promise<SigningKey[]>;
  getUserSigningKeyIndex(accountId: AccountId, signingKey: GrumpkinAddress): Promise<number | undefined>;
  removeUserSigningKeys(accountId: AccountId): Promise<void>;

  setAlias(alias: Alias): Promise<void>;
  setAliases(alias: Alias[]): Promise<void>;
  getAlias(aliasHash: AliasHash, address: GrumpkinAddress): Promise<Alias | undefined>;
  getAliases(aliasHash: AliasHash): Promise<Alias[]>;
  getLatestNonceByAddress(address: GrumpkinAddress): Promise<number | undefined>;
  getLatestAlias(aliasHash: AliasHash): Promise<Alias | undefined>;
  getAliasHashByAddress(address: GrumpkinAddress, nonce?: number): Promise<AliasHash | undefined>;
  getAddressByAliasHash(aliasHash: AliasHash, nonce?: number): Promise<GrumpkinAddress | undefined>;

  deleteKey(name: string): Promise<void>;
  addKey(name: string, value: Buffer): Promise<void>;
  getKey(name: string): Promise<Buffer | undefined>;
}

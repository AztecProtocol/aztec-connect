import { Note } from '../note';
import { UserData } from '../user';
import { UserTx } from '../user_tx';
import { EthAddress, GrumpkinAddress } from 'barretenberg/address';

export interface SigningKey {
  owner: EthAddress;
  treeIndex: number;
  key: Buffer;
}

export interface Database {
  addNote(note: Note): Promise<void>;
  getNote(treeIndex: number): Promise<Note | undefined>;
  getNoteByNullifier(userId: EthAddress, nullifier: Buffer): Promise<Note | undefined>;
  nullifyNote(index: number): Promise<void>;
  getUserNotes(userId: EthAddress): Promise<Note[]>;

  getUser(userId: EthAddress): Promise<UserData | undefined>;
  getUsers(): Promise<UserData[]>;
  addUser(user: UserData): Promise<void>;
  updateUser(user: UserData): Promise<void>;
  removeUser(userId: EthAddress): Promise<void>;
  resetUsers(): Promise<void>;

  getUserTx(userId: EthAddress, txHash: Buffer): Promise<UserTx | undefined>;
  getUserTxs(userId: EthAddress): Promise<UserTx[]>;
  addUserTx(userTx: UserTx): Promise<void>;
  settleUserTx(userId: EthAddress, txHash: Buffer): Promise<void>;
  deleteUserTx(userId: EthAddress, txHash: Buffer): Promise<void>;

  getUserSigningKeys(userId: EthAddress): Promise<SigningKey[]>;
  addUserSigningKey(signingKey: SigningKey): Promise<void>;
  removeUserSigningKey(signingKey: SigningKey): Promise<void>;

  addAlias(aliasHash: Buffer, address: GrumpkinAddress): Promise<void>;
  getAliasAddress(aliasHash: Buffer): Promise<GrumpkinAddress | undefined>;

  deleteKey(name: string): Promise<void>;
  addKey(name: string, value: Buffer): Promise<void>;
  getKey(name: string): Promise<Uint8Array | undefined>;
}

import { GrumpkinAddress } from 'barretenberg/address';
import { Note } from '../note';
import { UserData } from '../user';
import { UserTx } from '../user_tx';

export interface SigningKey {
  owner: Buffer;
  treeIndex: number;
  key: Buffer;
}

export interface Database {
  addNote(note: Note): Promise<void>;
  getNote(treeIndex: number): Promise<Note | undefined>;
  getNoteByNullifier(userId: Buffer, nullifier: Buffer): Promise<Note | undefined>;
  nullifyNote(index: number): Promise<void>;
  getUserNotes(userId: Buffer): Promise<Note[]>;

  getUser(userId: Buffer): Promise<UserData | undefined>;
  getUserByPrivateKey(privateKey: Buffer): Promise<UserData | undefined>;
  getUsers(): Promise<UserData[]>;
  addUser(user: UserData): Promise<void>;
  updateUser(user: UserData): Promise<void>;
  removeUser(userId: Buffer): Promise<void>;
  resetUsers(): Promise<void>;

  getUserTx(userId: Buffer, txHash: Buffer): Promise<UserTx | undefined>;
  getUserTxs(userId: Buffer): Promise<UserTx[]>;
  addUserTx(userTx: UserTx): Promise<void>;
  settleUserTx(userId: Buffer, txHash: Buffer): Promise<void>;
  deleteUserTx(userId: Buffer, txHash: Buffer): Promise<void>;

  getUserSigningKeys(userId: Buffer): Promise<SigningKey[]>;
  addUserSigningKey(signingKey: SigningKey): Promise<void>;
  removeUserSigningKey(signingKey: SigningKey): Promise<void>;

  addAlias(aliasHash: Buffer, address: GrumpkinAddress): Promise<void>;
  getAliasAddress(aliasHash: Buffer): Promise<GrumpkinAddress | undefined>;

  deleteKey(name: string): Promise<void>;
  addKey(name: string, value: Buffer): Promise<void>;
  getKey(name: string): Promise<Uint8Array | undefined>;
}

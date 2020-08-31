import { Note } from '../note';
import { UserData } from '../user';
import { UserTx } from '../user_tx';
import { EthAddress } from 'barretenberg/address';

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
  getUserTx(userId: EthAddress, txHash: Buffer): Promise<UserTx | undefined>;
  getUserTxs(userId: EthAddress): Promise<UserTx[]>;
  addUserTx(userTx: UserTx): Promise<void>;
  settleUserTx(userId: EthAddress, txHash: Buffer): Promise<void>;
  deleteUserTx(userId: EthAddress, txHash: Buffer): Promise<void>;
  removeUser(userId: EthAddress): Promise<void>;
  resetUsers(): Promise<void>;
  deleteKey(name: string): Promise<void>;
  addKey(name: string, value: Buffer): Promise<void>;
  getKey(name: string): Promise<Uint8Array | undefined>;
}

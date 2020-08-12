import { Note } from '../note';
import { User } from '../user';
import { UserTx } from '../user_tx';

export interface Database {
  addNote(note: Note): Promise<void>;
  getNote(treeIndex: number): Promise<Note | undefined>;
  getNoteByNullifier(userId: number, nullifier: Buffer): Promise<Note | undefined>;
  nullifyNote(index: number): Promise<void>;
  getUserNotes(userId: number): Promise<Note[]>;
  getUser(userId: number): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  addUser(user: User): Promise<void>;
  getUserTx(userId: number, txHash: Buffer): Promise<UserTx | undefined>;
  getUserTxs(userId: number): Promise<UserTx[]>;
  addUserTx(userTx: UserTx): Promise<void>;
  settleUserTx(txHash: Buffer): Promise<void>;
  deleteUserTx(txHash: Buffer): Promise<void>;
  clearNote(): Promise<void>;
  clearUserTxState(): Promise<void>;
  clearUserTx(): Promise<void>;
  deleteKey(name: string): Promise<void>;
  addKey(name: string, value: Buffer): Promise<void>;
  getKey(name: string): Promise<Uint8Array | undefined>;
}

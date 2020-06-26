export type UserTxAction = 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'RECEIVE';

export class DbUser {
  constructor(public id: number, public publicKey: Uint8Array, public privateKey?: Uint8Array, public alias?: string) {}
}

export class DbUserTx {
  constructor(
    public txHash: Uint8Array,
    public userId: number,
    public action: UserTxAction,
    public value: number,
    public recipient: Uint8Array,
    public settled: 0 | 1, // boolean is non-indexable
    public created: Date,
    public inputNote1?: number,
    public inputNote2?: number,
    public outputNote1?: Uint8Array,
    public outputNote2?: Uint8Array,
  ) {}
}

export class DbNote {
  constructor(
    public id: number,
    public value: number,
    public dataEntry: Uint8Array,
    public viewingKey: Uint8Array,
    public encrypted: Uint8Array,
    public nullifier: Uint8Array,
    public nullified: 0 | 1,
    public owner: number,
  ) {}
}

export class DbKey {
  constructor(public name: string, public value: Uint8Array, public size: number, public count?: number) {}
}

export enum DbEvents {
  CREATE_USER_TX = 'CREATE_USER_TX',
}

export interface Database {
  addNote(note: DbNote): Promise<void>;
  getNote(treeIndex: number): Promise<DbNote | undefined>;
  getNoteByNullifier(userId: number, nullifier: Uint8Array): Promise<DbNote | undefined>;
  nullifyNote(index: number): Promise<void>;
  getUserNotes(userId: number): Promise<DbNote[]>;
  getUser(userId: number): Promise<DbUser | undefined>;
  getUsers(): Promise<DbUser[]>;
  addUser(user: DbUser): Promise<void>;
  getUserTxs(userId: number): Promise<DbUserTx[]>;
  addUserTx(userTx: DbUserTx): Promise<void>;
  settleUserTx(txHash: Uint8Array): Promise<void>;
  deleteUserTx(txHash: Uint8Array): Promise<void>;
  clearNote(): Promise<void>;
  clearUserTxState(): Promise<void>;
  deleteKey(name: string): Promise<void>;
  addKey(name: string, value: Buffer): Promise<void>;
  getKey(name: string): Promise<Uint8Array | undefined>;
}

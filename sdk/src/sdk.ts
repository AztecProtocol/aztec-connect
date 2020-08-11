import { RollupProviderStatus, Rollup, Tx } from 'barretenberg/rollup_provider';
import { EventEmitter } from 'events';
import { User } from './user';
import { UserTx } from './user_tx';

export enum SdkEvent {
  // For emitting interesting log info during long running operations.
  LOG = 'SDKEVENT_LOG',
  // Initialization state changes.
  UPDATED_INIT_STATE = 'SDKEVENT_UPDATED_INIT_STATE',
  // Balance for a user changes.
  UPDATED_BALANCE = 'SDKEVENT_UPDATED_BALANCE',
  // Accounts are switched.
  UPDATED_ACCOUNT = 'SDKEVENT_UPDATED_ACCOUNT',
  // A user is added.
  UPDATED_USERS = 'SDKEVENT_UPDATED_USERS',
  // A transaction has been created within the current context.
  NEW_USER_TX = 'SDKEVENT_NEW_USER_TX',
  // A transaction has been added/updated (could be from a remote update).
  UPDATED_USER_TX = 'SDKEVENT_UPDATED_USER_TX',
  // Explorer rollups have updated.
  UPDATED_EXPLORER_ROLLUPS = 'SDKEVENT_UPDATED_EXPLORER_ROLLUPS',
  // Explorer txs have updated.
  UPDATED_EXPLORER_TXS = 'SDKEVENT_UPDATED_EXPLORER_TXS',
}

export enum SdkInitState {
  UNINITIALIZED = 'Uninitialized',
  INITIALIZING = 'Initializing',
  INITIALIZED = 'Initialized',
  DESTROYED = 'Destroyed',
}

export interface Signer {
  getAddress(): Buffer;
  signMessage(data: Buffer): Promise<Buffer>;
}

export type TxHash = Buffer;

export interface Sdk extends EventEmitter {
  init(): Promise<void>;

  destroy(): Promise<void>;

  restart(): Promise<void>;

  clearData(): Promise<void>;

  getInitState(): SdkInitState;

  getDataRoot(): Buffer;

  getDataSize(): number;

  getStatus(): Promise<RollupProviderStatus>;

  deposit(value: number, signer: Signer, noteRecipient?: Buffer): Promise<TxHash>;

  withdraw(value: number, tokenRecipient: Buffer): Promise<TxHash>;

  transfer(value: number, noteRecipient: Buffer): Promise<TxHash>;

  publicTransfer(value: number, signer: Signer, tokenRecipient: Buffer): Promise<TxHash>;

  awaitSynchronised(): Promise<void>;

  awaitSettlement(txHash: TxHash): Promise<void>;

  getUser(): User;

  getUsers(localOnly: boolean): User[];

  createUser(alias?: string): Promise<User>;

  addUser(alias: string, publicKey: Buffer): Promise<User>;

  switchToUser(userIdOrAlias: string | number): User;

  getBalance(userIdOrAlias?: string | number): number;

  getLatestRollups(): Promise<Rollup[]>;

  getLatestTxs(): Promise<Tx[]>;

  getRollup(rollupId: number): Promise<Rollup | undefined>;

  getTx(txHash: Buffer): Promise<Tx | undefined>;

  getUserTxs(userId: number): Promise<UserTx[]>;

  findUser(userIdOrAlias: string | number, remote: boolean): User | undefined;

  startTrackingGlobalState(): void;

  stopTrackingGlobalState(): void;
}

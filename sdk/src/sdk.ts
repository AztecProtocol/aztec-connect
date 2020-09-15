import { RollupProviderStatus, Rollup, Tx } from 'barretenberg/rollup_provider';
import { EventEmitter } from 'events';
import { UserData, KeyPair } from './user';
import { UserTx } from './user_tx';
import { EthAddress, GrumpkinAddress, Address } from 'barretenberg/address';

export enum SdkEvent {
  // Initialization state changes.
  UPDATED_INIT_STATE = 'SDKEVENT_UPDATED_INIT_STATE',
  // The sdk action state has changed.
  UPDATED_ACTION_STATE = 'SDKEVENT_UPDATED_ACTION_STATE',
  // The set of users has changed.
  UPDATED_USERS = 'SDKEVENT_UPDATED_USERS',
  // A users state has changed.
  UPDATED_USER_STATE = 'SDKEVENT_UPDATED_USER_STATE',
  // The world state has updated. Used for displaying sync progress.
  UPDATED_WORLD_STATE = 'SDKEVENT_UPDATED_WORLD_STATE',
  // Explorer rollups have updated.
  UPDATED_EXPLORER_ROLLUPS = 'SDKEVENT_UPDATED_EXPLORER_ROLLUPS',
  // Explorer txs have updated.
  UPDATED_EXPLORER_TXS = 'SDKEVENT_UPDATED_EXPLORER_TXS',
}

export enum AssetId {
  DAI,
}

export enum SdkInitState {
  UNINITIALIZED = 'UNINITIALIZED',
  INITIALIZING = 'INITIALIZING',
  INITIALIZED = 'INITIALIZED',
  DESTROYED = 'DESTROYED',
}

export enum Action {
  APPROVE = 'APPROVE',
  DEPOSIT = 'DEPOSIT',
  TRANSFER = 'TRANSFER',
  PUBLIC_TRANSFER = 'PUBLIC_TRANSFER',
  WITHDRAW = 'WITHDRAW',
  MINT = 'MINT',
  ACCOUNT = 'ACCOUNT',
}

export interface ActionState {
  action: Action;
  value: bigint;
  sender: Buffer;
  recipient: Address;
  created: Date;
  txHash?: Buffer;
  error?: Error;
}

export type TxHash = Buffer;

export interface SdkUserAsset {
  publicBalance(ethAddress: EthAddress): Promise<bigint>;
  publicAllowance(ethAddress: EthAddress): Promise<bigint>;
  balance(): bigint;

  mint(value: bigint, from: EthAddress): Promise<TxHash>;
  approve(value: bigint, from: EthAddress): Promise<TxHash>;
  deposit(value: bigint, from: EthAddress, to?: GrumpkinAddress | string): Promise<TxHash>;
  withdraw(value: bigint, to: EthAddress): Promise<TxHash>;
  transfer(value: bigint, to: GrumpkinAddress | string): Promise<TxHash>;
  publicTransfer(value: bigint, from: EthAddress, to: EthAddress): Promise<TxHash>;

  fromErc20Units(value: bigint): string;
  toErc20Units(value: string): bigint;
}

export interface SdkUser {
  createAccount(alias: string, newSigningPublicKey?: GrumpkinAddress): Promise<TxHash>;
  addSigningKey(signingPublicKey: Buffer): Promise<void>;
  removeSigningKey(signingPublicKey: Buffer): Promise<void>;
  getUserData(): UserData;
  getTxs(): Promise<UserTx[]>;
  getAsset(assetId: AssetId): SdkUserAsset;
}

export interface SdkStatus {
  chainId: number;
  rollupContractAddress: EthAddress;
  syncedToRollup: number;
  latestRollupId: number;
  initState: SdkInitState;
  dataSize: number;
  dataRoot: Buffer;
}

export interface Sdk extends EventEmitter {
  init(): Promise<void>;

  /**
   * Destroys the sdk. Cannot be used afterwards.
   */
  destroy(): Promise<void>;

  /**
   * Erases all sdk cache data and reinitializes.
   */
  clearData(): Promise<void>;

  getLocalStatus(): SdkStatus;

  getRemoteStatus(): Promise<RollupProviderStatus>;

  /**
   * Blocks until local state is synchronised with rollup provider state.
   * Effectively waits until the local and remote data roots match.
   */
  awaitSynchronised(): Promise<void>;

  /**
   * Return true if the sdk is busy performing an action.
   */
  isBusy(): boolean;

  /**
   * Add a user with the given ethereum address.
   * Will prompt the user to sign a message with `address`, from which we generate the grumpkin key.
   */
  addUser(privateKey: Buffer): Promise<SdkUser>;

  getUser(userId: Buffer): SdkUser | undefined;

  getUsersData(): UserData[];

  removeUser(userId: Buffer): Promise<void>;

  newKeyPair(): KeyPair;

  getAddressFromAlias(alias: string): Promise<GrumpkinAddress | undefined>;

  /**
   * Returns the current action state, from which you can determine what the sdk is currently doing.
   */
  getActionState(userId?: Buffer): ActionState | undefined;

  /**
   * Will block until the given tx hash is settled.
   * We need to specify the eth address as we record each tx for each user.
   */
  awaitSettlement(userId: Buffer, txHash: TxHash, timeout?: number): Promise<void>;

  // Explorer
  getLatestRollups(num: number): Promise<Rollup[]>;

  getLatestTxs(num: number): Promise<Tx[]>;

  getTx(txHash: Buffer): Promise<Tx | undefined>;

  getRollup(rollupId: number): Promise<Rollup | undefined>;

  startTrackingGlobalState(): void;

  stopTrackingGlobalState(): void;
}

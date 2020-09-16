import { Address, EthAddress } from 'barretenberg/address';

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

export interface SdkStatus {
  chainId: number;
  rollupContractAddress: EthAddress;
  syncedToRollup: number;
  latestRollupId: number;
  initState: SdkInitState;
  dataSize: number;
  dataRoot: Buffer;
}

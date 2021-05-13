import { EthAddress } from 'barretenberg/address';
import { BlockchainAsset } from 'barretenberg/blockchain';

export enum SdkEvent {
  // Initialization state changes.
  UPDATED_INIT_STATE = 'SDKEVENT_UPDATED_INIT_STATE',
  // The set of users has changed.
  UPDATED_USERS = 'SDKEVENT_UPDATED_USERS',
  // A users state has changed.
  UPDATED_USER_STATE = 'SDKEVENT_UPDATED_USER_STATE',
  // The world state has updated. Used for displaying sync progress.
  UPDATED_WORLD_STATE = 'SDKEVENT_UPDATED_WORLD_STATE',
  // Log messages for long running operations.
  LOG = 'SDKEVENT_LOG',
}

export enum SdkInitState {
  UNINITIALIZED = 'UNINITIALIZED',
  INITIALIZING = 'INITIALIZING',
  INITIALIZED = 'INITIALIZED',
  DESTROYED = 'DESTROYED',
}

export interface SdkStatus {
  chainId: number;
  rollupContractAddress: EthAddress;
  syncedToRollup: number;
  latestRollupId: number;
  initState: SdkInitState;
  dataSize: number;
  dataRoot: Buffer;
  assets: BlockchainAsset[];
}

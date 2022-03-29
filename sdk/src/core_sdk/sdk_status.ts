import { EthAddress } from '@aztec/barretenberg/address';

export enum SdkEvent {
  // The set of users has changed.
  UPDATED_USERS = 'SDKEVENT_UPDATED_USERS',
  // A users state has changed.
  UPDATED_USER_STATE = 'SDKEVENT_UPDATED_USER_STATE',
  // The world state has updated. Used for displaying sync progress.
  UPDATED_WORLD_STATE = 'SDKEVENT_UPDATED_WORLD_STATE',
  // The sdk has been destroyed.
  DESTROYED = 'SDKEVENT_DESTROYED',
}

export interface SdkStatus {
  serverUrl: string;
  chainId: number;
  rollupContractAddress: EthAddress;
  syncedToRollup: number;
  latestRollupId: number;
  dataSize: number;
  dataRoot: Buffer;
}

export interface SdkStatusJson {
  serverUrl: string;
  chainId: number;
  rollupContractAddress: string;
  syncedToRollup: number;
  latestRollupId: number;
  dataSize: number;
  dataRoot: string;
}

export const sdkStatusToJson = (status: SdkStatus): SdkStatusJson => ({
  ...status,
  rollupContractAddress: status.rollupContractAddress.toString(),
  dataRoot: status.dataRoot.toString('hex'),
});

export const sdkStatusFromJson = (json: SdkStatusJson): SdkStatus => ({
  ...json,
  rollupContractAddress: EthAddress.fromString(json.rollupContractAddress),
  dataRoot: Buffer.from(json.dataRoot, 'hex'),
});

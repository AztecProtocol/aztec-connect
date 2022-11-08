import { EthAddress } from '@aztec/barretenberg/address';

export enum SdkEvent {
  // The SDK version does not match the rollup provider version
  VERSION_MISMATCH = 'SDKEVENT_VERSION_MISMATCH',
  // A users state has changed.
  UPDATED_USER_STATE = 'SDKEVENT_UPDATED_USER_STATE',
  // The world state has updated. Used for displaying sync progress.
  UPDATED_WORLD_STATE = 'SDKEVENT_UPDATED_WORLD_STATE',
  // The sdk has been destroyed.
  DESTROYED = 'SDKEVENT_DESTROYED',
}

type Jsonify<T> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [P in keyof T]: T[P] extends EthAddress | bigint | Buffer ? string : T[P] extends Object ? Jsonify<T[P]> : T[P];
};

export interface SdkStatus {
  serverUrl: string;
  chainId: number;
  rollupContractAddress: EthAddress;
  permitHelperContractAddress: EthAddress;
  verifierContractAddress: EthAddress;
  feePayingAssetIds: number[];
  rollupSize: number;
  syncedToRollup: number;
  latestRollupId: number;
  dataSize: number;
  dataRoot: Buffer;
  useKeyCache: boolean;
  proverless: boolean;
  version: string;
}

export type SdkStatusJson = Jsonify<SdkStatus>;

export const sdkStatusToJson = (status: SdkStatus): SdkStatusJson => ({
  ...status,
  rollupContractAddress: status.rollupContractAddress.toString(),
  permitHelperContractAddress: status.permitHelperContractAddress.toString(),
  verifierContractAddress: status.verifierContractAddress.toString(),
  dataRoot: status.dataRoot.toString('hex'),
});

export const sdkStatusFromJson = (json: SdkStatusJson): SdkStatus => ({
  ...json,
  rollupContractAddress: EthAddress.fromString(json.rollupContractAddress),
  permitHelperContractAddress: EthAddress.fromString(json.permitHelperContractAddress),
  verifierContractAddress: EthAddress.fromString(json.verifierContractAddress),
  dataRoot: Buffer.from(json.dataRoot, 'hex'),
});

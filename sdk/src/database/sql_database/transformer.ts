import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { TxId } from '@aztec/barretenberg/tx_id';
import { ValueTransformer } from 'typeorm';

export const bigintTransformer: ValueTransformer = {
  to: (entityValue?: bigint) => (entityValue !== undefined ? `${entityValue}` : ''),
  from: (dbValue?: string) => (dbValue ? BigInt(dbValue) : undefined),
};

export const grumpkinAddressTransformer: ValueTransformer = {
  to: (entityValue?: GrumpkinAddress) => entityValue?.toBuffer(),
  from: (dbValue?: Buffer) => (dbValue ? new GrumpkinAddress(dbValue) : undefined),
};

export const aliasHashTransformer: ValueTransformer = {
  to: (entityValue?: AliasHash) => entityValue?.toBuffer(),
  from: (dbValue?: Buffer) => (dbValue ? new AliasHash(dbValue) : undefined),
};

export const txIdTransformer: ValueTransformer = {
  to: (entityValue?: TxId) => entityValue?.toBuffer(),
  from: (dbValue?: Buffer) => (dbValue ? new TxId(dbValue) : undefined),
};

export const ethAddressTransformer: ValueTransformer = {
  to: (entityValue?: EthAddress) => entityValue?.toBuffer(),
  from: (dbValue?: Buffer) => (dbValue ? new EthAddress(dbValue) : undefined),
};

export const bridgeIdTransformer: ValueTransformer = {
  to: (entityValue?: BridgeId) => entityValue?.toBuffer(),
  from: (dbValue?: Buffer) => (dbValue ? BridgeId.fromBuffer(dbValue) : undefined),
};

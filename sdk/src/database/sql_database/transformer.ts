import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { ValueTransformer } from 'typeorm';
import { AccountAliasId, AccountId } from '../../user';

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

export const accountAliasIdTransformer: ValueTransformer = {
  to: (entityValue?: AccountAliasId) => entityValue?.toBuffer(),
  from: (dbValue?: Buffer) => (dbValue ? AccountAliasId.fromBuffer(dbValue) : undefined),
};

export const accountIdTransformer: ValueTransformer = {
  to: (entityValue?: AccountId) => entityValue?.toBuffer(),
  from: (dbValue?: Buffer) => (dbValue ? AccountId.fromBuffer(dbValue) : undefined),
};

export const txHashTransformer: ValueTransformer = {
  to: (entityValue?: TxHash) => entityValue?.toBuffer(),
  from: (dbValue?: Buffer) => (dbValue ? new TxHash(dbValue) : undefined),
};

export const ethAddressTransformer: ValueTransformer = {
  to: (entityValue?: EthAddress) => entityValue?.toBuffer(),
  from: (dbValue?: Buffer) => (dbValue ? new EthAddress(dbValue) : undefined),
};

export const bridgeIdTransformer: ValueTransformer = {
  to: (entityValue?: BridgeId) => entityValue?.toBuffer(),
  from: (dbValue?: Buffer) => (dbValue ? BridgeId.fromBuffer(dbValue) : undefined),
};

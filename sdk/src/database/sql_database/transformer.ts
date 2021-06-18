import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';
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

export const viewingKeyTransformer: ValueTransformer = {
  to: (entityValue?: ViewingKey) => entityValue?.toBuffer(),
  from: (dbValue?: Buffer) => (dbValue ? new ViewingKey(dbValue) : undefined),
};

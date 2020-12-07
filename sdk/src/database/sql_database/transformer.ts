import { GrumpkinAddress } from 'barretenberg/address';
import { AliasHash } from 'barretenberg/client_proofs/alias_hash';
import { TxHash } from 'barretenberg/rollup_provider';
import { ValueTransformer } from 'typeorm';
import { AccountAliasId, AccountId } from '../../user';

export const bigintTransformer: ValueTransformer = {
  to: (entityValue?: bigint) => (entityValue !== undefined ? `${entityValue}` : ''),
  from: (dbValue?: string) => BigInt(dbValue),
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

import { EthAddress } from '@aztec/barretenberg/address';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';
import { ValueTransformer } from 'typeorm';

export const bigintTransformer: ValueTransformer = {
  to: (entityValue?: bigint) => (entityValue !== undefined ? `${entityValue}` : ''),
  from: (dbValue?: string) => (dbValue ? BigInt(dbValue) : undefined),
};

export const ethAddressTransformer: ValueTransformer = {
  to: (entityValue?: EthAddress) => entityValue?.toBuffer(),
  from: (dbValue?: Buffer) => (dbValue ? new EthAddress(dbValue) : undefined),
};

export const viewingKeyTransformer: ValueTransformer = {
  to: (entityValue?: ViewingKey) => entityValue?.toBuffer(),
  from: (dbValue: Buffer) => new ViewingKey(dbValue),
};

export const txHashTransformer: ValueTransformer = {
  to: (entityValue?: TxHash) => entityValue?.toBuffer(),
  from: (dbValue: Buffer | null) => (dbValue ? new TxHash(dbValue) : undefined),
};

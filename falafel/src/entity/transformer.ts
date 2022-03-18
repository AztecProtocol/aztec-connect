import { EthAddress } from '@aztec/barretenberg/address';
import { TxHash } from '@aztec/barretenberg/blockchain';
import { ValueTransformer } from 'typeorm';

export const bigintTransformer: ValueTransformer = {
  to: (entityValue?: bigint) => (entityValue !== undefined ? `${entityValue}` : ''),
  from: (dbValue?: string) => (dbValue ? BigInt(dbValue) : undefined),
};

export const ethAddressTransformer: ValueTransformer = {
  to: (entityValue?: EthAddress) => entityValue?.toBuffer(),
  from: (dbValue?: Buffer) => (dbValue ? new EthAddress(dbValue) : undefined),
};

export const txHashTransformer: ValueTransformer = {
  to: (entityValue?: TxHash) => entityValue?.toBuffer(),
  from: (dbValue: Buffer | null) => (dbValue ? new TxHash(dbValue) : undefined),
};

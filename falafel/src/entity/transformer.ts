import { EthAddress } from 'barretenberg/address';
import { ValueTransformer } from 'typeorm';

export const bigintTransformer: ValueTransformer = {
  to: (entityValue?: bigint) => (entityValue !== undefined ? `${entityValue}` : ''),
  from: (dbValue?: string) => (dbValue ? BigInt(dbValue) : undefined),
};

export const ethAddressTransformer: ValueTransformer = {
  to: (entityValue?: EthAddress) => entityValue?.toBuffer(),
  from: (dbValue?: Buffer) => (dbValue ? new EthAddress(dbValue) : undefined),
};

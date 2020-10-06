import { GrumpkinAddress } from 'barretenberg/address';
import { ValueTransformer } from 'typeorm';

export const bigintTransformer: ValueTransformer = {
  to: (entityValue: bigint) => `${entityValue}`,
  from: (dbValue: string) => BigInt(dbValue),
};

export const grumpkinAddressTransformer: ValueTransformer = {
  to: (entityValue: GrumpkinAddress) => entityValue.toBuffer(),
  from: (dbValue: Buffer) => new GrumpkinAddress(dbValue),
};

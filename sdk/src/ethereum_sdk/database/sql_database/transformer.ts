import { EthAddress } from 'barretenberg/address';
import { ValueTransformer } from 'typeorm';

export const ethAddressTransformer: ValueTransformer = {
  to: (entityValue: EthAddress) => entityValue.toBuffer(),
  from: (dbValue: Buffer) => new EthAddress(dbValue),
};

import { EthAddress } from 'barretenberg/address';
import { randomBytes } from 'crypto';
import { DbAccount } from '../database';

export const randomAccount = (): DbAccount => ({
  ethAddress: EthAddress.randomAddress(),
  userId: randomBytes(32),
});

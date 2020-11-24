import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { DbAccount } from '../database';

export const randomAccount = (): DbAccount => ({
  ethAddress: EthAddress.randomAddress(),
  accountPublicKey: GrumpkinAddress.randomAddress(),
});

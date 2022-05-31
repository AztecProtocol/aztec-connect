import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { Signer } from '../signer';

export interface FeePayer {
  userId: GrumpkinAddress;
  signer: Signer;
}

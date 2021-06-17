import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { Signature } from '@aztec/barretenberg/client_proofs/signature';

export interface Signer {
  getPublicKey(): GrumpkinAddress;
  signMessage(message: Buffer): Promise<Signature>;
}

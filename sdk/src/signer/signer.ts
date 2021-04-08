import { GrumpkinAddress } from 'barretenberg/address';
import { Signature } from 'barretenberg/client_proofs/signature';

export interface Signer {
  getPublicKey(): GrumpkinAddress;
  signMessage(message: Buffer): Promise<Signature>;
}

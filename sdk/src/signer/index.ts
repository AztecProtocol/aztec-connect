import { GrumpkinAddress } from 'barretenberg/address';
import { Signature } from 'barretenberg/client_proofs/signature';

export * from './schnorr_signer';
export * from './recover_signer';

export interface Signer {
  getPublicKey(): GrumpkinAddress;
  signMessage(message: Buffer): Promise<Signature>;
}

import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { SchnorrSignature } from '@aztec/barretenberg/crypto';

export interface KeyPair {
  getPublicKey(): GrumpkinAddress;
  getPrivateKey(): Promise<Buffer>;
  signMessage(message: Buffer): Promise<SchnorrSignature>;
}

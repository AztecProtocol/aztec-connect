import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { SchnorrSignature } from '@aztec/barretenberg/crypto/schnorr';
import { Signer } from './signer';

export class RecoverSignatureSigner implements Signer {
  constructor(private publicKey: GrumpkinAddress, private signature: SchnorrSignature) {}

  getPublicKey() {
    return this.publicKey;
  }

  async signMessage() {
    return this.signature;
  }
}

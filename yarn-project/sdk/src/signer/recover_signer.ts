import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { SchnorrSignature } from '@aztec/barretenberg/crypto';
import { Signer } from './signer.js';

export class RecoverSignatureSigner implements Signer {
  constructor(private publicKey: GrumpkinAddress, private signature: SchnorrSignature) {}

  getPublicKey() {
    return this.publicKey;
  }

  signMessage() {
    return Promise.resolve(this.signature);
  }
}

import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { SchnorrSignature } from '@aztec/barretenberg/crypto';
import { Signer } from './signer.js';

interface Schnorr {
  constructSignature(message: Buffer, privateKey: Buffer): Promise<SchnorrSignature>;
}

export class SchnorrSigner implements Signer {
  constructor(private schnorr: Schnorr, private publicKey: GrumpkinAddress, private privateKey: Buffer) {}

  getPublicKey() {
    return this.publicKey;
  }

  signMessage(message: Buffer) {
    return Promise.resolve(this.schnorr.constructSignature(message, this.privateKey));
  }
}

import { Schnorr } from 'barretenberg/crypto/schnorr';
import { Signer } from '.';

export class SchnorrSigner implements Signer {
  constructor(private schnorr: Schnorr, private privateKey: Buffer) {}

  async signMessage(message: Buffer) {
    return this.schnorr.constructSignature(message, this.privateKey);
  }
}

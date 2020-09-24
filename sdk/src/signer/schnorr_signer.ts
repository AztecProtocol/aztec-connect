import { GrumpkinAddress } from 'barretenberg/address';
import { Schnorr } from 'barretenberg/crypto/schnorr';
import { Signer } from '.';

export class SchnorrSigner implements Signer {
  constructor(private schnorr: Schnorr, private publicKey: GrumpkinAddress, private privateKey: Buffer) {}

  getPublicKey() {
    return this.publicKey;
  }

  async signMessage(message: Buffer) {
    return this.schnorr.constructSignature(message, this.privateKey);
  }
}

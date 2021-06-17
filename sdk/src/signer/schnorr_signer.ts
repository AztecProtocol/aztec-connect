import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { Schnorr } from '@aztec/barretenberg/crypto/schnorr';
import { Signer } from './signer';

export class SchnorrSigner implements Signer {
  constructor(private schnorr: Schnorr, private publicKey: GrumpkinAddress, private privateKey: Buffer) {}

  getPublicKey() {
    return this.publicKey;
  }

  async signMessage(message: Buffer) {
    return this.schnorr.constructSignature(message, this.privateKey);
  }
}

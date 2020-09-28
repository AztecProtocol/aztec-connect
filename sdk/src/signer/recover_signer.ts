import { GrumpkinAddress } from 'barretenberg/address';
import { Signature } from 'barretenberg/client_proofs/signature';
import { Signer } from '.';

export class RecoverSignatureSigner implements Signer {
  constructor(private publicKey: GrumpkinAddress, private signature: Signature) {}

  getPublicKey() {
    return this.publicKey;
  }

  async signMessage() {
    return this.signature;
  }
}

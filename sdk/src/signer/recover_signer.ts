import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { Signature } from '@aztec/barretenberg/client_proofs/signature';
import { Signer } from './signer';

export class RecoverSignatureSigner implements Signer {
  constructor(private publicKey: GrumpkinAddress, private signature: Signature) {}

  getPublicKey() {
    return this.publicKey;
  }

  async signMessage() {
    return this.signature;
  }
}

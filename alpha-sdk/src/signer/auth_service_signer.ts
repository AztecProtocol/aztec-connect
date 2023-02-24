import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { SchnorrSignature } from '@aztec/barretenberg/crypto';
import { Signer } from './signer.js';

interface AuthServiceProvider {
  signMessage(message: Buffer, publicKey: GrumpkinAddress): Promise<SchnorrSignature>;
}

export class AuthServiceSigner implements Signer {
  constructor(private provider: AuthServiceProvider, private publicKey: GrumpkinAddress) {}

  public getPublicKey() {
    return this.publicKey;
  }

  public async signMessage(message: Buffer) {
    return await this.provider.signMessage(message, this.publicKey);
  }
}

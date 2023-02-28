import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { randomBytes, Schnorr } from '@aztec/barretenberg/crypto';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { KeyPair } from './key_pair.js';

export class ConstantKeyPair implements KeyPair {
  public static random(grumpkin: Grumpkin, schnorr: Schnorr) {
    const privateKey = randomBytes(32);
    const publicKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.generator, privateKey));
    return new ConstantKeyPair(publicKey, privateKey, schnorr);
  }

  constructor(private publicKey: GrumpkinAddress, private privateKey: Buffer, private schnorr: Schnorr) {}

  public getPublicKey() {
    return this.publicKey;
  }

  public getPrivateKey() {
    return Promise.resolve(this.privateKey);
  }

  public signMessage(message: Buffer) {
    return Promise.resolve(this.schnorr.constructSignature(message, this.privateKey));
  }
}

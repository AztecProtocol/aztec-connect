import { GrumpkinAddress } from 'barretenberg/address';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { randomBytes } from 'crypto';

export interface Signer {
  signMessage(message: string | Buffer): Promise<string>;
  getAddress(): Promise<string>;
}

export interface UserData {
  id: Buffer;
  privateKey: Buffer;
  publicKey: GrumpkinAddress;
  alias?: string;
  syncedToBlock: number;
  syncedToRollup: number;
}

export interface KeyPair {
  publicKey: GrumpkinAddress;
  privateKey: Buffer;
}

export const deriveGrumpkinPrivateKey = async (signer: Signer) => {
  const sig = await signer.signMessage('Link Aztec account.');
  return Buffer.from(sig.slice(2)).slice(0, 32);
};

export class UserDataFactory {
  constructor(private grumpkin: Grumpkin) {}

  async createUser(privateKey: Buffer): Promise<UserData> {
    const publicKey = new GrumpkinAddress(this.grumpkin.mul(Grumpkin.one, privateKey));
    return { id: publicKey.toBuffer(), privateKey, publicKey, syncedToBlock: -1, syncedToRollup: -1 };
  }

  public newKeyPair(): KeyPair {
    const privateKey = randomBytes(32);
    const publicKey = new GrumpkinAddress(this.grumpkin.mul(Grumpkin.one, privateKey));
    return { publicKey, privateKey };
  }
}

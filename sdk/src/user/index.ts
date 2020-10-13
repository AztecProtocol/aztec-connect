import { GrumpkinAddress } from 'barretenberg/address';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { EthereumSigner } from '../signer';

export * from './recovery_payload';

export interface UserData {
  id: Buffer;
  privateKey: Buffer;
  publicKey: GrumpkinAddress;
  alias?: string;
  syncedToRollup: number;
}

export const deriveGrumpkinPrivateKey = async (signer: EthereumSigner) => {
  const sig = await signer.signMessage(Buffer.from('Link Aztec account.'));
  return Buffer.from(sig.slice(2)).slice(0, 32);
};

export class UserDataFactory {
  constructor(private grumpkin: Grumpkin) {}

  async createUser(privateKey: Buffer): Promise<UserData> {
    const publicKey = new GrumpkinAddress(this.grumpkin.mul(Grumpkin.one, privateKey));
    return { id: publicKey.toBuffer(), privateKey, publicKey, syncedToRollup: -1 };
  }
}

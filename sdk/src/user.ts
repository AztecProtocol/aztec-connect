import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { Web3Provider } from '@ethersproject/providers';
import { randomBytes } from 'crypto';

export interface UserData {
  ethAddress: EthAddress;
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

export class UserDataFactory {
  constructor(private grumpkin: Grumpkin, private ethersProvider: Web3Provider) {}

  private async deriveGrumpkinPrivateKey(ethAddress: EthAddress) {
    const signer = this.ethersProvider.getSigner(ethAddress.toString());
    const sig = await signer.signMessage('Link Aztec account.');
    return Buffer.from(sig.slice(2)).slice(0, 32);
  }

  async createUser(ethAddress: EthAddress): Promise<UserData> {
    const privateKey = await this.deriveGrumpkinPrivateKey(ethAddress);
    const publicKey = new GrumpkinAddress(this.grumpkin.mul(Grumpkin.one, privateKey));
    return { ethAddress, privateKey, publicKey, syncedToBlock: -1, syncedToRollup: -1 };
  }

  public newKeyPair(): KeyPair {
    const privateKey = randomBytes(32);
    const publicKey = new GrumpkinAddress(this.grumpkin.mul(Grumpkin.one, privateKey));
    return { publicKey, privateKey };
  }
}

import { Web3Provider } from '@ethersproject/providers';
import { EthAddress } from 'barretenberg/address';
import { EthereumSigner } from './index';

export class Web3Signer implements EthereumSigner {
  constructor(private provider: Web3Provider, private address: EthAddress) {}

  getAddress() {
    return this.address;
  }

  async signMessage(message: Buffer) {
    const signer = this.provider.getSigner(this.address.toString());
    return Buffer.from((await signer.signMessage(message)).slice(2), 'hex');
  }
}

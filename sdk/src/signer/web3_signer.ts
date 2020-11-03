import { Web3Provider } from '@ethersproject/providers';
import { EthAddress } from 'barretenberg/address';
import { EthereumProvider } from '..';
import { EthereumSigner } from './index';

export class Web3Signer implements EthereumSigner {
  private web3provider: Web3Provider;

  constructor(provider: EthereumProvider, private address: EthAddress) {
    this.web3provider = new Web3Provider(provider);
  }

  getAddress() {
    return this.address;
  }

  async signMessage(message: Buffer) {
    const signer = this.web3provider.getSigner(this.address.toString());
    const sig = await signer.signMessage(message);
    return Buffer.from(sig.slice(2), 'hex');
  }

  async signTypedData({ domain, types, message }: any) {
    const signer = this.web3provider.getSigner(this.address.toString());
    const result = await signer._signTypedData(domain, types, message);
    const signature = Buffer.from(result.slice(2), 'hex');
    const r = signature.slice(0, 32);
    const s = signature.slice(32, 64);
    const v = signature.slice(64, 65);
    return { v, r, s };
  }
}

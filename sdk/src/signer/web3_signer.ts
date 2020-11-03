import { Web3Provider, JsonRpcSigner } from '@ethersproject/providers';
import { EthAddress } from 'barretenberg/address';
import { Wallet } from 'ethers';
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

  async signTypedData({ domain, types, message }: any) {
    const signer = this.provider.getSigner(this.address.toString());
    const signature = (await signer._signTypedData(domain, types, message)).slice(2);
    const r = Buffer.from(signature.slice(0, 64), 'hex');
    const s = Buffer.from(signature.slice(64, 128), 'hex');
    const v = Buffer.from(signature.slice(128, 130), 'hex');
    return { v, r, s };
  }
}

export class EthersEthereumSigner implements EthereumSigner {
  constructor(private etherSigner: Wallet | JsonRpcSigner, private address: EthAddress) {}

  getAddress() {
    return this.address;
  }

  async signMessage(message: Buffer) {
    return Buffer.from((await this.etherSigner.signMessage(message)).slice(2), 'hex');
  }

  async signTypedData({ domain, types, message }: any) {
    const signature = (await this.etherSigner._signTypedData(domain, types, message)).slice(2);
    const r = Buffer.from(signature.slice(0, 64), 'hex');
    const s = Buffer.from(signature.slice(64, 128), 'hex');
    const v = Buffer.from(signature.slice(128, 130), 'hex');
    return { v, r, s };
  }
}

import { EthAddress, EthereumProvider } from '@aztec/sdk';
import { Web3Provider } from '@ethersproject/providers';

export class Web3Signer {
  private web3provider: Web3Provider;

  constructor(provider: EthereumProvider) {
    this.web3provider = new Web3Provider(provider);
  }

  async signMessage(message: Buffer, address: EthAddress) {
    const signer = this.web3provider.getSigner(address.toString());
    const sig = await signer.signMessage(message);
    const signature = Buffer.from(sig.slice(2), 'hex');

    // Ganache is not signature standard compliant. Returns 00 or 01 as v.
    // Need to adjust to make v 27 or 28.
    const v = signature[signature.length - 1];
    if (v <= 1) {
      return Buffer.concat([signature.slice(0, -1), Buffer.from([v + 27])]);
    }

    return signature;
  }
}

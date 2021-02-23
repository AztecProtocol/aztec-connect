import { EthAddress, EthereumProvider } from '@aztec/sdk';
import { Web3Provider } from '@ethersproject/providers';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { utils } from 'ethers';

export class Web3Signer {
  private web3provider: Web3Provider;

  constructor(private provider: EthereumProvider) {
    this.web3provider = new Web3Provider(provider);
  }

  async signMessage(message: Buffer, address: EthAddress) {
    const signer = this.web3provider.getSigner(address.toString());
    let sig: string;
    if (this.provider instanceof WalletConnectProvider) {
      const toSign = [
        ...utils.toUtf8Bytes(`\x19Ethereum Signed Message:\n${message.length}`),
        ...new Uint8Array(message),
      ];
      sig = await this.provider.connector.signMessage([address.toString().toLowerCase(), utils.keccak256(toSign)]);
    } else {
      sig = await signer.signMessage(message);
    }
    return Buffer.from(sig.slice(2), 'hex');
  }
}

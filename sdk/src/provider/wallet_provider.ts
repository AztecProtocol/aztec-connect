import {
  EthereumProvider,
  ProviderConnectInfo,
  ProviderMessage,
  ProviderRpcError,
  RequestArguments,
} from './ethereum_provider';
import { Wallet } from 'ethers';
import { TransactionRequest } from '@ethersproject/abstract-provider';
import { EthAddress } from 'barretenberg/address';

export class WalletProvider implements EthereumProvider {
  private accounts: Wallet[] = [];

  constructor(private provider: EthereumProvider) {}

  public addAccount(privateKey: Buffer) {
    const wallet = new Wallet(privateKey);
    this.accounts.push(wallet);
    return EthAddress.fromString(wallet.address);
  }

  async request(args: RequestArguments): Promise<any> {
    switch (args.method) {
      case 'eth_sign':
        return await this.sign(args);
      case 'eth_signTypedData_v4':
        return this.signTypedData(args);
      case 'eth_signTransaction':
        return this.signTransaction(args);
      case 'eth_sendTransaction':
        return this.sendTransaction(args);
      default: {
        return await this.provider.request(args);
      }
    }
  }

  private async sign(args: RequestArguments) {
    const [from, message] = args.params!;
    const account = this.accounts.find(a => a.address.toLowerCase() === from);
    if (account) {
      return await account.signMessage(Buffer.from(message.slice(2), 'hex'));
    }
    return await this.provider.request(args);
  }

  private async signTypedData(args: RequestArguments) {
    const [from, data] = args.params!;
    const { types, domain, message } = JSON.parse(data);
    const account = this.accounts.find(a => a.address.toLowerCase() === from);
    if (account) {
      return await account._signTypedData(domain, types, message);
    }
    return this.provider.request(args);
  }

  private async signTransaction(args: RequestArguments) {
    const tx = args.params![0] as TransactionRequest;
    const account = this.accounts.find(a => a.address.toLowerCase() === tx.from);
    if (account) {
      return await account.signTransaction(tx);
    }
    return this.provider.request(args);
  }

  private async sendTransaction(args: RequestArguments) {
    const tx = args.params![0];
    const account = this.accounts.find(a => a.address.toLowerCase() === tx.from);
    if (account) {
      const { gas, ...rest } = tx;
      const nonce = await this.provider.request({ method: 'eth_getTransactionCount', params: [tx.from, 'latest'] });
      const result = await account.signTransaction({ ...rest, gasLimit: gas, nonce });
      return this.provider.request({ method: 'eth_sendRawTransaction', params: [result] });
    }
    return this.provider.request(args);
  }

  on(notification: 'connect', listener: (connectInfo: ProviderConnectInfo) => void): this;
  on(notification: 'disconnect', listener: (error: ProviderRpcError) => void): this;
  on(notification: 'chainChanged', listener: (chainId: string) => void): this;
  on(notification: 'accountsChanged', listener: (accounts: string[]) => void): this;
  on(notification: 'message', listener: (message: ProviderMessage) => void): this;
  on(notification: any, listener: any) {
    return this.provider.on(notification, listener);
  }

  removeListener(notification: 'connect', listener: (connectInfo: ProviderConnectInfo) => void): this;
  removeListener(notification: 'disconnect', listener: (error: ProviderRpcError) => void): this;
  removeListener(notification: 'chainChanged', listener: (chainId: string) => void): this;
  removeListener(notification: 'accountsChanged', listener: (accounts: string[]) => void): this;
  removeListener(notification: 'message', listener: (message: ProviderMessage) => void): this;
  removeListener(notification: any, listener: any) {
    return this.provider.removeListener(notification, listener);
  }
}

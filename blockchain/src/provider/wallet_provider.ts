import {
  EthereumProvider,
  ProviderConnectInfo,
  ProviderMessage,
  ProviderRpcError,
  RequestArguments,
} from './ethereum_provider';
import { Wallet } from 'ethers';
import { EthAddress } from 'barretenberg/address';
import { EthersAdapter } from './ethers_adapter';
import { JsonRpcProvider } from '@ethersproject/providers';

/**
 * Given an EIP1193 provider, wraps it, and provides the ability to add local accounts.
 */
export class WalletProvider implements EthereumProvider {
  private accounts: Wallet[] = [];

  constructor(private provider: EthereumProvider) {}

  public static fromHost(ethereumHost: string) {
    const ethersProvider = new JsonRpcProvider(ethereumHost);
    return new WalletProvider(new EthersAdapter(ethersProvider));
  }

  public addAccount(privateKey: Buffer) {
    return this.addEthersWallet(new Wallet(privateKey));
  }

  public addEthersWallet(wallet: Wallet) {
    this.accounts.push(wallet);
    return EthAddress.fromString(wallet.address);
  }

  public getAccounts() {
    return this.accounts.map(a => EthAddress.fromString(a.address));
  }

  public getAccount(account: number) {
    return EthAddress.fromString(this.accounts[account].address);
  }

  public getPrivateKey(account: number) {
    return Buffer.from(this.accounts[account].privateKey.slice(2), 'hex');
  }

  public getPrivateKeyForAddress(account: EthAddress) {
    const wallet = this.accounts.find(w => account.equals(EthAddress.fromString(w.address)));
    return wallet ? Buffer.from(wallet.privateKey.slice(2), 'hex') : undefined;
  }

  async request(args: RequestArguments): Promise<any> {
    switch (args.method) {
      case 'eth_accounts':
        return this.accounts.length ? this.accounts.map(a => a.address) : await this.provider.request(args);
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
      delete types.EIP712Domain;
      return await account._signTypedData(domain, types, message);
    }
    return this.provider.request(args);
  }

  /**
   * Given a tx in Eth Json Rpc format, convert to ethers format and give to account to sign.
   * Populate any missing fields.
   */
  private async signTxLocally(tx: any, account: Wallet) {
    const gasLimit = tx.gas || 7000000;
    const gasPrice = tx.gasPrice || (await this.provider.request({ method: 'eth_gasPrice' }));
    const value = tx.value || 0;
    const nonce =
      tx.nonce || (await this.provider.request({ method: 'eth_getTransactionCount', params: [tx.from, 'latest'] }));

    const toSign = {
      from: tx.from,
      to: tx.to,
      data: tx.data,
      gasLimit,
      gasPrice,
      value,
      nonce,
    };
    return await account.signTransaction(toSign);
  }

  private async signTransaction(args: RequestArguments) {
    const tx = args.params![0];
    const account = this.accounts.find(a => a.address.toLowerCase() === tx.from.toLowerCase());
    if (account) {
      return this.signTxLocally(tx, account);
    }
    return this.provider.request(args);
  }

  private async sendTransaction(args: RequestArguments) {
    const tx = args.params![0];
    const account = this.accounts.find(a => a.address.toLowerCase() === tx.from.toLowerCase());
    if (account) {
      const result = await this.signTxLocally(tx, account);
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

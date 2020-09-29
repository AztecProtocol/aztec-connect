import { WebSdk, WalletSdk } from 'aztec2-sdk';
import { EthereumProvider } from 'aztec2-sdk/ethereum_provider';
import { EventEmitter } from 'events';
import { createContext } from 'react';
import { EthProvider, MockEthProvider, Web3EthProvider } from './eth_provider';
// For use in live code editor.
import * as aztecSdk from 'aztec2-sdk';
import * as crypto from 'crypto';
import ethers from 'ethers';

const SERVER_URL =
  process.env.NODE_ENV === 'development'
    ? `${window.location.protocol}//${window.location.hostname}:8081`
    : window.location.origin;

export enum LinkAccountState {
  LINKING = 'Linking',
  LINKED = 'Linked',
  UNLINKED = 'Unlinked',
}

export enum AppEvent {
  UPDATED_LINK_ACCOUNT_STATE = 'UPDATED_LINK_ACCOUNT_STATE',
}

export class App extends EventEmitter {
  public webSdk!: WebSdk;
  public walletSdk!: WalletSdk;
  public ethProvider: EthProvider;

  constructor(private ethereumProvider?: EthereumProvider) {
    super();
    this.ethProvider = ethereumProvider ? new Web3EthProvider(ethereumProvider) : new MockEthProvider();
    if (ethereumProvider) {
      this.webSdk = new WebSdk(ethereumProvider);
      this.walletSdk = new WalletSdk(ethereumProvider);
    }
  }

  isSdkAvailable() {
    return !!this.ethereumProvider;
  }

  async createSdk(serverUrl = SERVER_URL) {
    await this.webSdk!.init(serverUrl);
    await this.walletSdk!.init(serverUrl, { debug: true });
  }

  getAvailableArgs() {
    const userData = this.webSdk.getUser().getUserData();
    const signer = userData.alias
      ? undefined
      : this.webSdk.getSdk().createSchnorrSigner(userData.publicKey, userData.privateKey);
    return {
      aztecSdk: this.walletSdk,
      userId: userData.id,
      signer,
    };
  }

  getAvailableModules() {
    return {
      '@aztec/sdk': aztecSdk,
      crypto,
      ethers,
    };
  }

  getVarReplacements() {
    const account = this.ethProvider.getAccount();
    return {
      SERVER_URL,
      USER_ETH_ADDRESS: account ? account.toString() : 'USER_ETH_ADDRESS',
      RECIPIENT_ETH_ADDRESS: '0x1E11a16335E410EB5f4e7A781C6f069609E5946A',
      RECIPIENT_PUBLIC_KEY:
        '0x0548c797a06b701f8d1e93981cbe15fd4e38bd1eef5f6b51fc1c387eeca89c9c2d8a15127cdd03b6d89acea877dc34a21278ca60865bbec2df5596a532a5e051',
      RECIPIENT_ALIAS: 'aztec',
    };
  }

  async getEth(amount: string) {
    // TODO
  }
}

export const AppContext = createContext<App | null>(null);

import { EthereumProvider, WebSdk, WalletSdk } from '@aztec/sdk';
import { EventEmitter } from 'events';
import { createContext } from 'react';
import { EthProvider, MockEthProvider, Web3EthProvider } from './eth_provider';
// For use in live code editor.
import * as aztecSdk from '@aztec/sdk';
import * as crypto from 'crypto';
import ethers from 'ethers';

const SERVER_URL =
  process.env.NODE_ENV === 'development'
    ? `${window.location.protocol}//${window.location.hostname}:8081`
    : 'https://aztec.network/falafel';

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
    const signer = userData.alias ? undefined : this.webSdk.getSdk().createSchnorrSigner(userData.privateKey);
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
      RECIPIENT_ETH_ADDRESS: '0xcF217475D84997E9c0EbA3052E1F818916fE3eEC',
      RECIPIENT_PUBLIC_KEY:
        '0x110b33f1659d950d264e4e3678f2032beccd371ff2129658cf04ac0ad5376249225947147ca67adee95f170602f290e9ac097902bf3af8f83b270ea0ed779c86',
      RECIPIENT_ALIAS: 'aztec',
    };
  }

  async getEth(amount: string) {
    // TODO
  }
}

export const AppContext = createContext<App | null>(null);

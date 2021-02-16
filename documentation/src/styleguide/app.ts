import { AssetId, EthereumProvider, WebSdk, EthAddress } from '@aztec/sdk';
import { Web3Provider } from '@ethersproject/providers';
import { EventEmitter } from 'events';
import { createContext } from 'react';
// For use in live code editor.
import * as aztecSdk from '@aztec/sdk';
import * as crypto from 'crypto';
import ethers from 'ethers';

export const SERVER_URL =
  process.env.NODE_ENV === 'development'
    ? `${window.location.protocol}//${window.location.hostname}:8081`
    : 'https://api.aztec.network/falafel';

export const BLOCK_EXPLORER_URL =
  process.env.NODE_ENV === 'development'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : 'https://explorer.aztec.network';

export class App extends EventEmitter {
  private webSdk!: WebSdk;
  private web3Provider!: Web3Provider;
  private assetId = AssetId.DAI;

  constructor(private ethereumProvider?: EthereumProvider) {
    super();
    if (ethereumProvider) {
      this.webSdk = new WebSdk(ethereumProvider);
      this.web3Provider = new Web3Provider(ethereumProvider);
    }
  }

  isSdkAvailable() {
    return !!this.ethereumProvider;
  }

  async createSdk(serverUrl = SERVER_URL) {
    try {
      await this.webSdk.init(serverUrl, { debug: true });
    } catch (e) {
      console.error(e);
    }
  }

  getWeb3Provider() {
    return this.web3Provider;
  }

  getWebSdk() {
    return this.webSdk;
  }

  getWalletSdk() {
    // @ts-ignore
    return this.webSdk.getSdk().walletSdk;
  }

  getAssetId() {
    return this.assetId;
  }

  getAvailableArgs() {
    const user = this.webSdk.getUser();
    const userData = user.getUserData();
    const signer = this.getWalletSdk().createSchnorrSigner(userData.privateKey);
    return {
      aztecSdk: this.getWalletSdk(),
      userId: userData.id,
      accountPublicKey: userData.id.publicKey,
      nonce: userData.id.nonce,
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
    return {
      SERVER_URL,
      BLOCK_EXPLORER_URL,
      RECIPIENT_ETH_ADDRESS: '0xcF217475D84997E9c0EbA3052E1F818916fE3eEC',
      RECIPIENT_PUBLIC_KEY:
        '0x110b33f1659d950d264e4e3678f2032beccd371ff2129658cf04ac0ad5376249225947147ca67adee95f170602f290e9ac097902bf3af8f83b270ea0ed779c86',
      RECIPIENT_ALIAS: 'aztec',
      SRIRACHA_URL: 'https://api.aztec.network/sriracha',
    };
  }

  public async getEthBalance(address: EthAddress) {
    const balance = await this.getWeb3Provider().getBalance(address.toString());
    return BigInt(balance.toString());
  }

  async getEth(amount: string) {
    // TODO
  }
}

export const AppContext = createContext<App | null>(null);

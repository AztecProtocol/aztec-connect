import { AztecSdk, EthAddress, GrumpkinAddress } from '@aztec/sdk';
import { AccountVersion } from './account_state';
import type { Provider } from './provider';

export const createSigningKeys = async (provider: Provider, sdk: AztecSdk) => {
  const ethAddress = provider.account!;
  return await sdk.generateSpendingKeyPair(ethAddress, provider.ethereumProvider);
};

export class KeyVault {
  private account: { privateKey: Buffer; publicKey: GrumpkinAddress; ethAddress: EthAddress; version: AccountVersion };

  constructor(privateKey: Buffer, publicKey: GrumpkinAddress, ethAddress: EthAddress, version: AccountVersion) {
    this.account = { privateKey, publicKey, ethAddress, version };
  }

  get accountPrivateKey() {
    return this.account.privateKey;
  }

  get accountPublicKey() {
    return this.account.publicKey;
  }

  get signerAddress() {
    return this.account.ethAddress;
  }

  get version() {
    return this.account.version;
  }

  static async create(provider: Provider, sdk: AztecSdk) {
    const ethAddress = provider.account!;
    const { privateKey, publicKey } = await sdk.generateAccountKeyPair(ethAddress, provider.ethereumProvider);
    return new KeyVault(privateKey, publicKey, ethAddress, AccountVersion.V1);
  }
}

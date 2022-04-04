import type { Provider } from './provider';
import { AztecSdk, EthAddress, GrumpkinAddress, Web3Signer } from '@aztec/sdk';
import { AccountVersion } from './account_state';

export const createSigningKeys = async (provider: Provider, sdk: AztecSdk) => {
  const message = Buffer.from(
    `Sign this message to generate your Aztec Spending Key. This key lets the application spend your funds on Aztec.\n\nIMPORTANT: Only sign this message if you trust the application.`,
  );
  const ethAddress = provider.account!;
  const signer = new Web3Signer(provider.ethereumProvider);
  const privateKey = (await signer.signPersonalMessage(message, ethAddress)).slice(0, 32);
  const publicKey = await sdk.derivePublicKey(privateKey);
  return { privateKey, publicKey };
};

export class KeyVault {
  static signingMessage = Buffer.from(
    `Sign this message to generate your Aztec Privacy Key. This key lets the application decrypt your balance on Aztec.\n\nIMPORTANT: Only sign this message if you trust the application.`,
  );

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
    const signer = new Web3Signer(provider.ethereumProvider);
    const privateKey = (await signer.signPersonalMessage(KeyVault.signingMessage, ethAddress)).slice(0, 32);
    const publicKey = await sdk.derivePublicKey(privateKey);
    return new KeyVault(privateKey, publicKey, ethAddress, AccountVersion.V1);
  }
}

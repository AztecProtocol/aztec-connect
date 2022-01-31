import { AztecSdk, EthAddress, GrumpkinAddress, Web3Signer } from '@aztec/sdk';
import { utils } from 'ethers';
import { AccountVersion } from './account_state';
import { Provider } from './provider';

// To be deprecated.
const hashToField = (value: Buffer, sdk: AztecSdk): Buffer => (sdk as any).core.blake2s.hashToField(value);
const formatSeedPhraseInput = (seedPhrase: string) => seedPhrase.replace(/\s+/g, ' ').trim();

export const createSigningKeys = async (provider: Provider, sdk: AztecSdk) => {
  const message = Buffer.from(
    `Sign this message to generate your Aztec Spending Key. This key lets the application spend your funds on Aztec.\n\nIMPORTANT: Only sign this message if you trust the application.`,
  );
  const ethAddress = provider.account!;
  const signer = new Web3Signer(provider.ethereumProvider);
  const privateKey = (await signer.signPersonalMessage(message, ethAddress)).slice(0, 32);
  const publicKey = sdk.derivePublicKey(privateKey);
  return { privateKey, publicKey };
};

export class KeyVault {
  static signingMessage = Buffer.from(
    `Sign this message to generate your Aztec Privacy Key. This key lets the application decrypt your balance on Aztec.\n\nIMPORTANT: Only sign this message if you trust the application.`,
  );

  // To be deprecated.
  static signingMessageV0(signerAddress: EthAddress, sdk: AztecSdk) {
    const message = hashToField(signerAddress.toBuffer(), sdk);
    const msgHash = utils.keccak256(message);
    return Buffer.from(utils.arrayify(msgHash));
  }

  private account: { privateKey: Buffer; publicKey: GrumpkinAddress; ethAddress: EthAddress; version: AccountVersion };

  constructor(privateKey: Buffer, ethAddress: EthAddress, sdk: AztecSdk, version: AccountVersion) {
    const publicKey = sdk.derivePublicKey(privateKey);
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
    return new KeyVault(privateKey, ethAddress, sdk, AccountVersion.V1);
  }

  // To be deprecated.
  static async createV0(provider: Provider, sdk: AztecSdk) {
    const ethAddress = provider.account!;
    const digest = KeyVault.signingMessageV0(ethAddress, sdk);
    const signer = new Web3Signer(provider.ethereumProvider);
    const privateKey = (await signer.signMessage(digest, ethAddress)).slice(0, 32);
    return new KeyVault(privateKey, ethAddress, sdk, AccountVersion.V0);
  }

  // To be deprecated.
  static fromSeedPhrase(seedPhrase: string, sdk: AztecSdk) {
    const privateKey = hashToField(Buffer.from(formatSeedPhraseInput(seedPhrase)), sdk);
    return new KeyVault(privateKey, EthAddress.ZERO, sdk, AccountVersion.V0);
  }
}

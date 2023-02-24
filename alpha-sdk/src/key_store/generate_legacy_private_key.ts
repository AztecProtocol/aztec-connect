import { EthAddress } from '@aztec/barretenberg/address';
import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { Web3Signer } from '@aztec/blockchain';

const LEGACY_ACCOUNT_KEY_MESSAGE =
  'Sign this message to generate your Aztec Privacy Key. This key lets the application decrypt your balance on Aztec.\n\nIMPORTANT: Only sign this message if you trust the application.';
const LEGACY_SPENDING_KEY_MESSAGE =
  'Sign this message to generate your Aztec Spending Key. This key lets the application spend your funds on Aztec.\n\nIMPORTANT: Only sign this message if you trust the application.';

async function generateLegacyPrivateKey(provider: EthereumProvider, account: EthAddress, signingData: Buffer) {
  const ethSigner = new Web3Signer(provider);
  const signature = await ethSigner.signPersonalMessage(signingData, account);
  return signature.slice(0, 32);
}

export async function generateLegacyAccountPrivateKey(provider: EthereumProvider, account: EthAddress) {
  return await generateLegacyPrivateKey(provider, account, Buffer.from(LEGACY_ACCOUNT_KEY_MESSAGE));
}

export async function generateLegacySpendingPrivateKey(provider: EthereumProvider, account: EthAddress) {
  return await generateLegacyPrivateKey(provider, account, Buffer.from(LEGACY_SPENDING_KEY_MESSAGE));
}

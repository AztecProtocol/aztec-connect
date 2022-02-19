import { EthAsset, JsonRpcProvider, WalletProvider } from '@aztec/sdk';
import { randomBytes } from 'crypto';

export async function createFundedWalletProvider(
  host: string,
  accounts: number,
  numAccountToFund = accounts,
  privateKey?: Buffer,
  initialBalance = 10n ** 18n,
) {
  const ethereumProvider = new JsonRpcProvider(host);
  const walletProvider = new WalletProvider(ethereumProvider);
  const ethAsset = new EthAsset(walletProvider);

  for (let i = 0; i < accounts; ++i) {
    walletProvider.addAccount(randomBytes(32));
  }

  const funder =
    privateKey && privateKey.length ? walletProvider.addAccount(privateKey) : (await ethereumProvider.getAccounts())[0];

  for (let i = 0; i < numAccountToFund; ++i) {
    const to = walletProvider.getAccount(i);
    await ethAsset.transfer(initialBalance, funder, to, { gasLimit: 1000000 });
  }

  return walletProvider;
}

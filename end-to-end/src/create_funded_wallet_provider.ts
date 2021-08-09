import { EthAsset, JsonRpcProvider, WalletProvider } from '@aztec/sdk';
import { randomBytes } from 'crypto';

export async function createFundedWalletProvider(host: string, accounts: number, initialBalance = 10n ** 18n) {
  const ethereumProvider = new JsonRpcProvider(host);
  const funder = (await ethereumProvider.getAccounts())[0];
  const ethAsset = new EthAsset(ethereumProvider);

  const walletProvider = new WalletProvider(ethereumProvider);
  for (let i = 0; i < accounts; ++i) {
    const to = walletProvider.addAccount(randomBytes(32));
    await ethAsset.transfer(initialBalance, funder, to);
  }

  return walletProvider;
}

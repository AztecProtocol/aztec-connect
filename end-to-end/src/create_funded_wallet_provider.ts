import { EthAsset, EthereumRpc, JsonRpcProvider, WalletProvider } from '@aztec/sdk';
import { randomBytes } from 'crypto';
import createDebug from 'debug';

const debug = createDebug('bb:create_funded_wallet_provider');

export async function createFundedWalletProvider(
  host: string,
  accounts: number,
  numAccountToFund = accounts,
  privateKey?: Buffer,
  initialBalance = 10n ** 18n,
  mnemonic?: string,
) {
  const ethereumProvider = new JsonRpcProvider(host);
  const walletProvider = new WalletProvider(ethereumProvider);
  const ethereumRpc = new EthereumRpc(ethereumProvider);
  const ganacheAccount = (await ethereumRpc.getAccounts())[0];
  const ethAsset = new EthAsset(walletProvider);

  for (let i = 0; i < accounts; ++i) {
    if (!mnemonic) {
      walletProvider.addAccount(randomBytes(32));
    } else {
      walletProvider.addAccountFromSeed(mnemonic, `m/44'/60'/0'/0/${i}`);
    }
  }

  const funder = privateKey && privateKey.length ? walletProvider.addAccount(privateKey) : ganacheAccount;
  debug(`funder: ${funder.toString()}`);

  for (let i = 0; i < numAccountToFund; ++i) {
    const to = walletProvider.getAccount(i);
    debug(`funding: ${to.toString()}`);
    await ethAsset.transfer(initialBalance, funder, to, { gasLimit: 1000000 });
  }

  return walletProvider;
}

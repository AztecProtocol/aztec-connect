import { EthAsset, EthereumRpc, JsonRpcProvider, WalletProvider } from '@aztec/sdk';
import { randomBytes } from 'crypto';
import createDebug from 'debug';

const debug = createDebug('bb:create_funded_wallet_provider');

/**
 * When the e2e tests are run in the context of CI, the privateKey is not provided, and we use provider account 0.
 * If the tests are to be run against a real environment, a privateKey for funding must be provided.
 *
 * @param host Url of underlying ethereum JSON RPC host.
 * @param accounts How many accounts to add to the wallet provider.
 * @param numAccountToFund How many of those accounts to fund.
 * @param privateKey The private key of the funding account. If not provided, use account 0 on the provider.
 * @param initialBalance The amount to fund each account with from the funding account.
 * @param mnemonic Optional mnemonic from which to derive the accounts, otherwise they're random.
 * @returns The WalletProvider
 */
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

  if (mnemonic) {
    walletProvider.addAccountsFromMnemonic(mnemonic, accounts);
  } else {
    for (let i = 0; i < accounts; ++i) {
      walletProvider.addAccount(randomBytes(32));
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

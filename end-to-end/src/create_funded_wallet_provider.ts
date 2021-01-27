import { JsonRpcProvider } from '@ethersproject/providers';
import { parseEther } from '@ethersproject/units';
import { EthersAdapter, WalletProvider } from '@aztec/sdk';
import { randomBytes } from 'crypto';

export async function createFundedWalletProvider(host: string, accounts: number, initialBalance = '1') {
  const ethersProvider = new JsonRpcProvider(host);
  const ethereumProvider = new EthersAdapter(ethersProvider);
  const funder = ethersProvider.getSigner(0);

  const walletProvider = new WalletProvider(ethereumProvider);
  for (let i = 0; i < accounts; ++i) {
    const to = walletProvider.addAccount(randomBytes(32));
    await funder.sendTransaction({
      to: to.toString(),
      value: parseEther(initialBalance),
    });
  }

  return walletProvider;
}

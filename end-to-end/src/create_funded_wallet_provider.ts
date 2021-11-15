import { JsonRpcProvider, TransactionResponse } from '@ethersproject/providers';
import { parseEther } from '@ethersproject/units';
import { Wallet } from 'ethers';
import { EthersAdapter, WalletProvider } from '@aztec/sdk';
import { randomBytes } from 'crypto';

export async function createFundedWalletProvider(
  host: string,
  accounts: number,
  numAccountToFund: number,
  privateKey: string,
  initialBalance = '1',
) {
  const ethersProvider = new JsonRpcProvider(host);
  const ethereumProvider = new EthersAdapter(ethersProvider);
  const funder = privateKey ? new Wallet(privateKey, ethersProvider) : ethersProvider.getSigner(0);

  const walletProvider = new WalletProvider(ethereumProvider);
  let lastTxResp: TransactionResponse;
  for (let i = 0; i < accounts; ++i) {
    const to = walletProvider.addAccount(randomBytes(32));
    if (i < numAccountToFund) {
      lastTxResp = await funder.sendTransaction({
        to: to.toString(),
        value: parseEther(initialBalance),
      });
    }
  }
  await lastTxResp!.wait();

  return walletProvider;
}

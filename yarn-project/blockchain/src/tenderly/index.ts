import { BigNumber } from 'ethers';
import { EthAddress } from '@aztec/barretenberg/address';
import { JsonRpcProvider } from '../index.js';

export const setEthBalance = async (addresses: EthAddress[], balance: bigint, host: string) => {
  const value = BigNumber.from(balance).toHexString();
  const provider = new JsonRpcProvider(host);

  for (const address of addresses) {
    await provider.request({
      method: 'tenderly_setBalance',
      params: [
        addresses.map(x => x.toString()),
        //amount in wei will be set for all wallets
        value,
      ],
    });
    const newBalance = await provider.request({
      method: 'eth_getBalance',
      params: [address.toString(), 'latest'],
    });
    console.log(`New balance of address ${address.toString()}: ${BigNumber.from(newBalance)}`);
  }
};

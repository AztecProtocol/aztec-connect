import { EthereumProvider } from "@aztec/barretenberg/blockchain";
import { Contract } from 'ethers';
import { Web3Provider } from '@ethersproject/providers';
import { abis } from './contract_abis';

export async function retrieveEvents(
  contractAddress: string,
  contractName: string,
  provider: EthereumProvider,
  eventName: string,
  from: number,
  to?: number,
) {
  const contract = new Contract(contractAddress, abis[contractName].abi, new Web3Provider(provider));
  const filter = contract.filters[eventName]();
  const events = await contract.queryFilter(filter, from, to);
  return events.map(event => contract.interface.parseLog(event));
}
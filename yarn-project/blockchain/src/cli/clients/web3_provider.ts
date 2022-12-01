import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { Web3Provider } from '@ethersproject/providers';

export const createWeb3Provider = (ethereumProvider: EthereumProvider) => new Web3Provider(ethereumProvider);

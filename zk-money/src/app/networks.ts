export interface Network {
  chainId: number;
  network: string;
}

export const networks: Network[] = [
  { chainId: 1, network: 'mainnet' },
  { chainId: 3, network: 'ropsten' },
  { chainId: 4, network: 'rinkeby' },
  { chainId: 5, network: 'goerli' },
  { chainId: 42, network: 'kovan' },
  { chainId: 1337, network: 'ganache' },
  { chainId: 0xa57ec, network: 'mainnet-fork' },
];

export const chainIdToNetwork = (chainId: number) => {
  return networks.find(network => network.chainId === chainId);
};

export const getNetwork = (network: string) => {
  return networks.find(n => n.network === network);
};

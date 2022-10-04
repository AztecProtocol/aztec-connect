export interface Network {
  chainId: number;
  network: string;
  isFrequent?: boolean;
}

export const networks: Network[] = [
  { chainId: 1, network: 'mainnet' },
  { chainId: 3, network: 'ropsten' },
  { chainId: 4, network: 'rinkeby' },
  { chainId: 5, network: 'goerli' },
  { chainId: 42, network: 'kovan' },
  { chainId: 1337, network: 'ganache', isFrequent: true },
  { chainId: 0xa57ec, network: 'mainnet-fork', isFrequent: true },
  { chainId: 0xdef, network: 'mainnet-fork', isFrequent: true },
];

export const chainIdToNetwork = (chainId: number) => {
  return networks.find(network => network.chainId === chainId);
};

export const getNetwork = (network: string) => {
  return networks.find(n => n.network === network);
};

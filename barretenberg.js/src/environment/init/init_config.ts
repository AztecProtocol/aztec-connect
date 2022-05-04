const initConfig = {
  '1': {
    initRoots: {
      initDataRoot: '08c5976319928065d5686996484f28347f14ae2030afe1fd4a6c617cd3e13622',
      initNullRoot: '11f101925e2161c75269195174fdd5f4aba7b460d0dd927b3726472a25d3221c',
      initRootsRoot: '217683028fc9cb7c910195ff8103d9208ca63b0b43b4da06ed9ee1a9c0156e9c',
    },
    initDataSize: 123544,
    accountsData: './data/mainnet/accounts',
  },
  default: {
    initRoots: {
      initDataRoot: '27f02a53c9a91e244f6f2d04d29c30684fb1f4b384ca72182f95325191315f8f',
      initNullRoot: '23f0ce83b1262404c1f7e3e43c221fb1177ce198fe697691036f0fca58d69dba',
      initRootsRoot: '18d5893d8b28a101fea70db8f4ed9027fcb40786c3bc8b4ca5552bf16d13f376',
    },
    initDataSize: 8,
    accountsData: './data/default/accounts',
    initAccounts: {
      mnemonic: 'once cost physical tongue reason coconut trick whip permit novel victory ritual',
      aliases: ['account1', 'account2', 'account3', 'account4'],
    },
  },
};

export function getInitData(chainId: number) {
  return initConfig[chainId] ?? initConfig['default'];
}

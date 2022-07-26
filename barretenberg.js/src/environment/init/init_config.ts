const initConfig = {
  '1': {
    initRoots: {
      initDataRoot: '06e00f331c68d8109607a35e1bc247b149864ecee6568697f4a77e3c8ff35472',
      initNullRoot: '20d5cc81a50d8e54f691566148510eaa8ba66d3ffe3ffbd770188990e45c6cce',
      initRootsRoot: '2157ebc03adae85518c931f7efe94ef29de35b9a1f1a7a6b6bc9f1a119641628',
    },
    initDataSize: 147624,
    accountsData: './data/mainnet/accounts',
    firstRollup: 0,
    lastRollup: 3120,
  },
  '677868' /* 0xa57ec */: {
    initRoots: {
      initDataRoot: '2a460f05d3dbdbb1d6ed8c3a1e589b13561dca0d49e4d496ae0d1d15c4aa1c68',
      initNullRoot: '1cb59b327064120bdf5ba23096b76cfe1ca8a45ab3db1b4f033bca92443cc025',
      initRootsRoot: '1c8ca5c80e65a610ca9326c65b7e1906864ad84e6c4d70e406f770f939934ecf',
    },
    initDataSize: 18,
    accountsData: './data/mainnet_fork/accounts',
    initAccounts: {
      mnemonic: 'cherry pretty dog employ tonight dry feature blade bean spray sleep fresh',
      aliases: ['legacy1', 'legacy2', 'legacy3', 'legacy4', 'legacy5', 'legacy6', 'legacy7', 'legacy8', 'legacy9'],
    },
  },
  default: {
    initRoots: {
      initDataRoot: '1417c092da90cfd39679299b8e381dd295dba6074b410e830ef6d3b7040b6eac',
      initNullRoot: '0225131cf7530ba9f617dba641b32020a746a6e0124310c09aac7c7c8a2e0ce5',
      initRootsRoot: '08ddeab28afc61bd560f0153f7399c9bb437c7cd280d0f4c19322227fcd80e05',
    },
    initDataSize: 8,
    accountsData: './data/default/accounts',
    initAccounts: {
      mnemonic: 'once cost physical tongue reason coconut trick whip permit novel victory ritual',
      aliases: ['account1', 'account2', 'account3', 'account4'],
    },
  },
  /* Empty defaults.
  default: {
    initRoots: {
      initDataRoot: '18ceb5cd201e1cee669a5c3ad96d3c4e933a365b37046fc3178264bede32c68d',
      initNullRoot: '298329c7d0936453f354e4a5eef4897296cc0bf5a66f2a528318508d2088dafa',
      initRootsRoot: '2fd2364bfe47ccb410eba3a958be9f39a8c6aca07db1abd15f5a211f51505071',
    },
    initDataSize: 0,
    accountsData: '',
  }, */
};

export function getInitData(chainId: number) {
  return initConfig[chainId] ?? initConfig['default'];
}

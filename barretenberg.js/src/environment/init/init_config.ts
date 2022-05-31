const initConfig = {
  '1': {
    initRoots: {
      initDataRoot: '08b8089346ce9612be7cf12fcacf49f4bfba619958245ad25cad60507505b654',
      initNullRoot: '0e1168117178772a4063fb7b00645b050ac7d06e683a255d7af95894632a1010',
      initRootsRoot: '27eea2d2b8b24fa2e18fb276396ebdbcd2f18e57caf610fe079589c182b53ad2',
    },
    initDataSize: 128078,
    accountsData: './data/mainnet/accounts',
    firstRollup: 0,
    lastRollup: 2735,
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
  /*   default: {
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

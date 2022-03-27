const initConfig = {
  '1': {
    initRoots: {
      initDataRoot: '27717599bd488a4f20967dbeff581a8965fa9b2ba68aa8a73c5213baedf2169d',
      initNullRoot: '1ccbf1f75b7704b101c66aef27f0ee7295d0dcc1742af9aaffb509d0dfca19a7',
      initRootsRoot: '1b20394c4e0dab9360186819141aede9dadfad9a419242f449a0e0e038b481f1',
    },
    initDataSize: 30288,
    accounts: './data/mainnet/accounts',
  },
  default: {
    initRoots: {
      initDataRoot: '18ceb5cd201e1cee669a5c3ad96d3c4e933a365b37046fc3178264bede32c68d',
      initNullRoot: '298329c7d0936453f354e4a5eef4897296cc0bf5a66f2a528318508d2088dafa',
      initRootsRoot: '2fd2364bfe47ccb410eba3a958be9f39a8c6aca07db1abd15f5a211f51505071',
    },
    initDataSize: 0,
  },
};

export function getInitData(chainId: number) {
  return initConfig[chainId] ?? initConfig['default'];
}

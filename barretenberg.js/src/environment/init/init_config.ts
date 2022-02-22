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
      initDataRoot: '11977941a807ca96cf02d1b15830a53296170bf8ac7d96e5cded7615d18ec607',
      initNullRoot: '1b831fad9b940f7d02feae1e9824c963ae45b3223e721138c6f73261e690c96a',
      initRootsRoot: '1b435f036fc17f4cc3862f961a8644839900a8e4f1d0b318a7046dd88b10be75',
    },
    initDataSize: 0,
  },
};

export function getInitData(chainId: number) {
  return initConfig[chainId] ?? initConfig['default'];
}

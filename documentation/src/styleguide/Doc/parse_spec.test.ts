import { parseSpec } from './parse_spec';

let consoleWarnSpy: jest.SpyInstance;
let warns: string[][] = [];

beforeAll(() => {
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((...args) => warns.push(args));
});

afterEach(() => {
  consoleWarnSpy.mockClear();
  warns = [];
});

afterAll(() => {
  consoleWarnSpy.mockRestore();
});

describe('parseSpec', () => {
  it('parse spec from a string', () => {
    expect(parseSpec('@spec sdk.ts deposit')).toEqual({
      srcName: 'sdk.ts',
      name: 'deposit',
      isDeclaration: false,
    });

    expect(parseSpec('  @spec  sdk.ts   deposit  ')).toEqual({
      srcName: 'sdk.ts',
      name: 'deposit',
      isDeclaration: false,
    });

    expect(parseSpec('@spec @aztec/sdk/sdk.d.ts ActionState')).toEqual({
      srcName: '@aztec/sdk/sdk.d.ts',
      name: 'ActionState',
      isDeclaration: true,
    });

    expect(parseSpec('@spec @aztec/sdk/web3\\_signer.d.ts Web3Signer')).toEqual({
      srcName: '@aztec/sdk/web3_signer.d.ts',
      name: 'Web3Signer',
      isDeclaration: true,
    });
  });

  it('parse spec with a specific type', () => {
    expect(parseSpec('@spec index.d.ts class WalletSdk')).toEqual({
      srcName: 'index.d.ts',
      name: 'WalletSdk',
      type: 'class',
      isDeclaration: true,
    });

    expect(parseSpec('@spec index.d.ts interface WalletSdk')).toEqual({
      srcName: 'index.d.ts',
      name: 'WalletSdk',
      type: 'interface',
      isDeclaration: true,
    });
  });

  it('will not return spec of invalid type', () => {
    expect(parseSpec('@spec index.d.ts sometype WalletSdk')).toBeUndefined();
  });

  it('parse spec with options', () => {
    expect(parseSpec('@spec index.d.ts WalletSdk [AS_INTERFACE]')).toEqual({
      srcName: 'index.d.ts',
      name: 'WalletSdk',
      isDeclaration: true,
      options: ['AS_INTERFACE'],
    });

    expect(parseSpec('@spec index.d.ts WalletSdk \\[AS_INTERFACE]')).toEqual({
      srcName: 'index.d.ts',
      name: 'WalletSdk',
      isDeclaration: true,
      options: ['AS_INTERFACE'],
    });
  });

  it('show warning if options in unknown', () => {
    expect(parseSpec('@spec index.d.ts WalletSdk [AS_ENUM | AS_INTERFACE]')).toEqual({
      srcName: 'index.d.ts',
      name: 'WalletSdk',
      isDeclaration: true,
      options: ['AS_ENUM', 'AS_INTERFACE'],
    });
    expect(warns.length).toBe(1);
    expect(warns[0]).toEqual([expect.stringMatching(/AS_ENUM/)]);
  });
});

import {
  destructParamsStr,
  destructFunctionStr,
  parseFunction,
  parseType,
  parseTypeDefinition,
} from './parse_type_definition';

describe('destructParamsStr', () => {
  it('parse params and return an array of strings', () => {
    expect(destructParamsStr('param: string')).toEqual(['param: string']);

    expect(destructParamsStr('param1: string, param2: number')).toEqual(['param1: string', 'param2: number']);

    expect(destructParamsStr('param1: string, param2: { key1: number, key2: bigint }, param3: Buffer')).toEqual([
      'param1: string',
      'param2: { key1: number, key2: bigint }',
      'param3: Buffer',
    ]);

    expect(destructParamsStr('param1: string, param2: () => number, param3: Buffer')).toEqual([
      'param1: string',
      'param2: () => number',
      'param3: Buffer',
    ]);

    expect(
      destructParamsStr('param1: string, param2: (arg1: string, arg2: bigint) => number, param3: Buffer'),
    ).toEqual(['param1: string', 'param2: (arg1: string, arg2: bigint) => number', 'param3: Buffer']);

    expect(
      destructParamsStr(
        'param1: string, param2: (arg1: string, arg2: { key1: string, key2: (listener: (e: Event) => void) => boolean }) => number, param3: Buffer',
      ),
    ).toEqual([
      'param1: string',
      'param2: (arg1: string, arg2: { key1: string, key2: (listener: (e: Event) => void) => boolean }) => number',
      'param3: Buffer',
    ]);
  });
});

describe('destructFunctionStr', () => {
  it('take a function definition and return its params part and returns part', () => {
    expect(destructFunctionStr('() => void')).toEqual({
      paramsStr: '',
      returnsStr: 'void',
    });

    expect(destructFunctionStr('(p1: string, p2: number) => void')).toEqual({
      paramsStr: 'p1: string, p2: number',
      returnsStr: 'void',
    });

    expect(destructFunctionStr('(p1: string, p2: number) => (e: Event) => void')).toEqual({
      paramsStr: 'p1: string, p2: number',
      returnsStr: '(e: Event) => void',
    });

    expect(
      destructFunctionStr('(p1: string, p2: (config: { key1: string, key2: number }) => bigint) => (e: Event) => void'),
    ).toEqual({
      paramsStr: 'p1: string, p2: (config: { key1: string, key2: number }) => bigint',
      returnsStr: '(e: Event) => void',
    });
  });
});

describe('parseFunction', () => {
  it('parse function definition and return a Type object', () => {
    expect(parseFunction('() => void')).toEqual({
      name: '',
      type: 'function',
      params: [],
      returns: 'void',
    });
  });
});

describe('parseType', () => {
  it('parse definition that has name and type', () => {
    expect(parseType('publicInput: bigint;')).toEqual({
      name: 'publicInput',
      type: 'bigint',
    });
  });

  it('parse definition that only has a name', () => {
    expect(parseType('private isSynchronised;')).toEqual({
      name: 'isSynchronised',
      type: 'any',
      isPrivate: true,
    });
  });

  it('parse a static variable', () => {
    expect(parseType('static ZERO: GrumpkinAddress;')).toEqual({
      name: 'ZERO',
      type: 'GrumpkinAddress',
      isStatic: true,
    });
  });

  it('parse a readonly value', () => {
    expect(parseType('readonly chainId: string;')).toEqual({
      name: 'chainId',
      type: 'string',
      isReadonly: true,
    });
  });

  it('parse function with return type', () => {
    expect(parseType('randomAddress(): GrumpkinAddress;')).toEqual({
      name: 'randomAddress',
      type: 'function',
      params: [],
      returns: 'GrumpkinAddress',
    });
  });

  it('parse function with multiple decorators', () => {
    expect(parseType('private static validate(): boolean;')).toEqual({
      name: 'validate',
      type: 'function',
      params: [],
      returns: 'boolean',
      isPrivate: true,
      isStatic: true,
    });
  });

  it('parse function with params and return type', () => {
    expect(parseType('isAddress(address: string): boolean;')).toEqual({
      name: 'isAddress',
      type: 'function',
      params: [
        {
          name: 'address',
          type: 'string',
        },
      ],
      returns: 'boolean',
    });
  });

  it('parse function without return type', () => {
    expect(parseType('constructor();')).toEqual({
      name: 'constructor',
      type: 'function',
      params: [],
      returns: 'void',
    });
  });

  it('parse function with params and without return type', () => {
    expect(parseType('constructor(buffer: Buffer);')).toEqual({
      name: 'constructor',
      type: 'function',
      params: [
        {
          name: 'buffer',
          type: 'Buffer',
        },
      ],
      returns: 'void',
    });
  });

  it('parse function with multiple params', () => {
    expect(parseType('mint(assetId: AssetId, value: bigint, to: EthAddress): Promise<Buffer>;')).toEqual({
      name: 'mint',
      type: 'function',
      params: [
        {
          name: 'assetId',
          type: 'AssetId',
        },
        {
          name: 'value',
          type: 'bigint',
        },
        {
          name: 'to',
          type: 'EthAddress',
        },
      ],
      returns: {
        name: '',
        type: 'promise',
        returns: 'Buffer',
      },
    });
  });

  it('parse function with optional params', () => {
    expect(parseType('deposit(value: bigint, signer?: Signer): Promise<Buffer>;')).toEqual({
      name: 'deposit',
      type: 'function',
      params: [
        {
          name: 'value',
          type: 'bigint',
        },
        {
          name: 'signer?',
          type: 'Signer',
        },
      ],
      returns: {
        name: '',
        type: 'promise',
        returns: 'Buffer',
      },
    });
  });

  it('parse function with decorators, params and return type', () => {
    expect(parseType('static fromString(address: string): GrumpkinAddress;')).toEqual({
      name: 'fromString',
      type: 'function',
      params: [
        {
          name: 'address',
          type: 'string',
        },
      ],
      returns: 'GrumpkinAddress',
      isStatic: true,
    });
  });

  it('parse function that returns an object', () => {
    expect(parseType('static deserialize(buf: Buffer, offset?: number): { elem: HashPath; adv: number; };')).toEqual({
      name: 'deserialize',
      type: 'function',
      params: [
        {
          name: 'buf',
          type: 'Buffer',
        },
        {
          name: 'offset?',
          type: 'number',
        },
      ],
      returns: {
        name: '',
        type: 'object',
        params: [
          {
            name: 'elem',
            type: 'HashPath',
          },
          {
            name: 'adv',
            type: 'number',
          },
        ],
      },
      isStatic: true,
    });
  });

  it('parse function that has function as param', () => {
    expect(
      parseType(
        'on(event: SdkEvent.UPDATED_INIT_STATE, listener: (initState: SdkInitState, message?: string) => void): this;',
      ),
    ).toEqual({
      name: 'on',
      type: 'function',
      params: [
        {
          name: 'event',
          type: 'SdkEvent.UPDATED_INIT_STATE',
        },
        {
          name: 'listener',
          type: {
            name: '',
            type: 'function',
            params: [
              {
                name: 'initState',
                type: 'SdkInitState',
              },
              {
                name: 'message?',
                type: 'string',
              },
            ],
            returns: 'void',
          },
        },
      ],
      returns: 'this',
    });
  });

  it('remove import syntax', () => {
    expect(parseType('getUserData(): import("..").UserData;')).toEqual({
      name: 'getUserData',
      type: 'function',
      params: [],
      returns: 'UserData',
    });

    expect(parseType('getUserData(): import("../user").UserData | undefined;')).toEqual({
      name: 'getUserData',
      type: 'function',
      params: [],
      returns: 'UserData | undefined',
    });

    expect(parseType('getLatestTxs(): Promise<import("barretenberg/rollup_provider").Tx[]>;')).toEqual({
      name: 'getLatestTxs',
      type: 'function',
      params: [],
      returns: {
        name: '',
        type: 'promise',
        returns: 'Tx[]',
      },
    });
  });

  it('parse promise that resolves an object', () => {
    expect(
      parseType(
        'generateAccountRecoveryData(trustedThirdPartyPublicKeys: GrumpkinAddress[]): Promise<{ recoveryPublicKey: GrumpkinAddress; recoveryPayloads: import("..").RecoveryPayload[]; }>;',
      ),
    ).toEqual({
      name: 'generateAccountRecoveryData',
      type: 'function',
      params: [
        {
          name: 'trustedThirdPartyPublicKeys',
          type: 'GrumpkinAddress[]',
        },
      ],
      returns: {
        name: '',
        type: 'promise',
        returns: {
          name: '',
          type: 'object',
          params: [
            {
              name: 'recoveryPublicKey',
              type: 'GrumpkinAddress',
            },
            {
              name: 'recoveryPayloads',
              type: 'RecoveryPayload[]',
            },
          ],
        },
      },
    });
  });
});

describe('parseTypeDefinition', () => {
  it('take type definition and return an array of type', () => {
    const content = `
      export declare class GrumpkinAddress implements Address {
          constructor(buffer: Buffer);
          static isAddress(address: string): boolean;
      }
    `;

    const types = parseTypeDefinition(content, 'GrumpkinAddress');
    expect(types).toEqual([
      {
        name: 'constructor',
        type: 'function',
        params: [
          {
            name: 'buffer',
            type: 'Buffer',
          },
        ],
        returns: 'void',
      },
      {
        name: 'isAddress',
        type: 'function',
        params: [
          {
            name: 'address',
            type: 'string',
          },
        ],
        returns: 'boolean',
        isStatic: true,
      },
    ]);
  });

  it('will skip comments', () => {
    const content = `
      /// <reference types="node" />
      export declare class GrumpkinAddress implements Address {
          constructor(buffer: Buffer);
          /**
           * Return a string in hexadecimal format.
           */
          toString(): string;
      }
      //# sourceMappingURL=grumpkin_address.d.ts.map
    `;

    const types = parseTypeDefinition(content, 'GrumpkinAddress');
    expect(types).toEqual([
      {
        name: 'constructor',
        type: 'function',
        params: [
          {
            name: 'buffer',
            type: 'Buffer',
          },
        ],
        returns: 'void',
      },
      {
        name: 'toString',
        type: 'function',
        params: [],
        returns: 'string',
      },
    ]);
  });

  it('can find the correct type definition by name', () => {
    const content = `
      export declare class Address {
          constructor(addressBuffer: Buffer);
      };

      export declare class GrumpkinAddress implements Address {
          constructor(grumpkinBuffer: Buffer);
      };

      export declare class EthAddress implements Address {
          constructor(ethBuffer: Buffer);
      };
    `;

    const types = parseTypeDefinition(content, 'GrumpkinAddress');
    expect(types).toEqual([
      {
        name: 'constructor',
        type: 'function',
        params: [
          {
            name: 'grumpkinBuffer',
            type: 'Buffer',
          },
        ],
        returns: 'void',
      },
    ]);
  });

  it('can find the correct type definition by decorator and name', () => {
    const content = `
      export interface WalletSdk {
          on(event: SdkEvent): this;
      }
      export declare class WalletSdk extends EventEmitter {
          constructor(ethereumProvider: EthereumProvider);
      };
      export declare function createWalletSdk(ethereumProvider: EthereumProvider, serverUrl: string): Promise<WalletSdk>;
    `;

    expect(parseTypeDefinition(content, 'WalletSdk', 'interface')).toEqual([
      {
        name: 'on',
        type: 'function',
        params: [
          {
            name: 'event',
            type: 'SdkEvent',
          },
        ],
        returns: 'this',
      },
    ]);

    expect(parseTypeDefinition(content, 'WalletSdk', 'class')).toEqual([
      {
        name: 'constructor',
        type: 'function',
        params: [
          {
            name: 'ethereumProvider',
            type: 'EthereumProvider',
          },
        ],
        returns: 'void',
      },
    ]);

    expect(parseTypeDefinition(content, 'createWalletSdk', 'function')).toEqual([
      {
        name: 'createWalletSdk',
        type: 'function',
        params: [
          {
            name: 'ethereumProvider',
            type: 'EthereumProvider',
          },
          {
            name: 'serverUrl',
            type: 'string',
          },
        ],
        returns: {
          name: '',
          type: 'promise',
          returns: 'WalletSdk',
        },
      },
    ]);
  });

  it('return empty array if type is not found', () => {
    const content = `
      export declare class Address {
          constructor(addressBuffer: Buffer);
      };
    `;

    const types = parseTypeDefinition(content, 'GrumpkinAddress');
    expect(types).toEqual([]);
  });

  it('parse multiline object', () => {
    const content = `
      export declare class HashPath {
          constructor(data?: Buffer[][]);
          static deserialize(buf: Buffer, offset?: number): {
            elem: HashPath;
            adv: number;
          };
      };
    `;

    const types = parseTypeDefinition(content, 'HashPath');
    expect(types).toEqual([
      {
        name: 'constructor',
        type: 'function',
        params: [
          {
            name: 'data?',
            type: 'Buffer[][]',
          },
        ],
        returns: 'void',
      },
      {
        name: 'deserialize',
        type: 'function',
        params: [
          {
            name: 'buf',
            type: 'Buffer',
          },
          {
            name: 'offset?',
            type: 'number',
          },
        ],
        returns: {
          name: '',
          type: 'object',
          params: [
            {
              name: 'elem',
              type: 'HashPath',
            },
            {
              name: 'adv',
              type: 'number',
            },
          ],
        },
        isStatic: true,
      },
    ]);
  });

  it('parse function that returns a promise that resolves an object', () => {
    const content = `
      export declare class WalletSdkUser {
          constructor(id: Buffer, sdk: WalletSdk);
          generateAccountRecoveryData(trustedThirdPartyPublicKeys: GrumpkinAddress[]): Promise<{
              recoveryPublicKey: GrumpkinAddress;
              recoveryPayloads: import("..").RecoveryPayload[];
          }>;
          addSigningKey(signingPublicKey: GrumpkinAddress, signer: Signer): Promise<Buffer>;
      }
    `;

    const types = parseTypeDefinition(content, 'WalletSdkUser');
    expect(types).toEqual([
      {
        name: 'constructor',
        type: 'function',
        params: [
          {
            name: 'id',
            type: 'Buffer',
          },
          {
            name: 'sdk',
            type: 'WalletSdk',
          },
        ],
        returns: 'void',
      },
      {
        name: 'generateAccountRecoveryData',
        type: 'function',
        params: [
          {
            name: 'trustedThirdPartyPublicKeys',
            type: 'GrumpkinAddress[]',
          },
        ],
        returns: {
          name: '',
          type: 'promise',
          returns: {
            name: '',
            type: 'object',
            params: [
              {
                name: 'recoveryPublicKey',
                type: 'GrumpkinAddress',
              },
              {
                name: 'recoveryPayloads',
                type: 'RecoveryPayload[]',
              },
            ],
          },
        },
      },
      {
        name: 'addSigningKey',
        type: 'function',
        params: [
          {
            name: 'signingPublicKey',
            type: 'GrumpkinAddress',
          },
          {
            name: 'signer',
            type: 'Signer',
          },
        ],
        returns: {
          name: '',
          type: 'promise',
          returns: 'Buffer',
        },
      },
    ]);
  });

  // TODO
  // it('parse multiline function', () => {
  //   const content = `
  //     export declare function deserializeArrayFromVector<T>(deserialize: (buf: Buffer, offset: number) => {
  //         elem: T;
  //         adv: number;
  //     }, vector: Buffer, offset?: number): {
  //         elem: T[];
  //         adv: number;
  //     };
  //   `;
  // });
});

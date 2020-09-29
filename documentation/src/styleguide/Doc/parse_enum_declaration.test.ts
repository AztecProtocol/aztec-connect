import { parseEnumDeclaration } from './parse_enum_declaration';

describe('parseEnumDeclaration', () => {
  const sourceCode = `
    export declare enum AssetId {
        DAI = 0
    }
    export declare type TxHash = Buffer;
    export declare enum InitState {
        UNINITIALIZED = "UNINITIALIZED",
        INITIALIZING = "INITIALIZING",
        INITIALIZED = "INITIALIZED",
        DESTROYED = "DESTROYED"
    }
    export interface ActionState {
        action: Action;
        value: bigint;
        sender: Buffer;
    }
    export declare type UserTxAction = 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'PUBLIC_TRANSFER' | 'RECEIVE' | 'ACCOUNT';
    export declare enum Action {
        DEPOSIT = "DEPOSIT",
        TRANSFER = "TRANSFER",
        WITHDRAW = "WITHDRAW",
    }
  `;

  it('return the code of a enum type without export syntax', () => {
    expect(parseEnumDeclaration(sourceCode, 'AssetId')).toBe(`enum AssetId {
        DAI = 0
    }`);

    expect(parseEnumDeclaration(sourceCode, 'InitState')).toBe(`enum InitState {
        UNINITIALIZED = "UNINITIALIZED",
        INITIALIZING = "INITIALIZING",
        INITIALIZED = "INITIALIZED",
        DESTROYED = "DESTROYED"
    }`);

    expect(parseEnumDeclaration(sourceCode, 'Action')).toBe(`enum Action {
        DEPOSIT = "DEPOSIT",
        TRANSFER = "TRANSFER",
        WITHDRAW = "WITHDRAW",
    }`);
  });

  it('return the code of a union type', () => {
    expect(parseEnumDeclaration(sourceCode, 'TxHash')).toBe(`type TxHash = Buffer;`);

    expect(parseEnumDeclaration(sourceCode, 'UserTxAction')).toBe(
      `type UserTxAction = 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'PUBLIC_TRANSFER' | 'RECEIVE' | 'ACCOUNT';`,
    );
  });
});

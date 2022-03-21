/// <reference types="node" />
export * from './aux_data_selector';
export * from './bridge_config';
export * from './bridge_status';
export declare class BitConfig {
    readonly firstInputVirtual: boolean;
    readonly secondInputVirtual: boolean;
    readonly firstOutputVirtual: boolean;
    readonly secondOutputVirtual: boolean;
    readonly secondInputReal: boolean;
    readonly secondOutputReal: boolean;
    static EMPTY: BitConfig;
    constructor(firstInputVirtual: boolean, secondInputVirtual: boolean, firstOutputVirtual: boolean, secondOutputVirtual: boolean, secondInputReal: boolean, secondOutputReal: boolean);
    static random(): BitConfig;
    static fromBigInt(val: bigint): BitConfig;
    toBigInt(): bigint;
}
export declare class BridgeId {
    readonly addressId: number;
    readonly inputAssetIdA: number;
    readonly outputAssetIdA: number;
    readonly outputAssetIdB: number;
    readonly inputAssetIdB: number;
    readonly bitConfig: BitConfig;
    readonly auxData: number;
    static ZERO: BridgeId;
    static ENCODED_LENGTH_IN_BYTES: number;
    static ADDRESS_BIT_LEN: number;
    static INPUT_ASSET_ID_A_LEN: number;
    static OUTPUT_A_ASSET_ID_LEN: number;
    static OUTPUT_B_ASSET_ID_LEN: number;
    static BITCONFIG_LEN: number;
    static INPUT_ASSET_ID_B_LEN: number;
    static AUX_DATA_LEN: number;
    static ADDRESS_OFFSET: number;
    static INPUT_ASSET_ID_A_OFFSET: number;
    static OUTPUT_A_ASSET_ID_OFFSET: number;
    static OUTPUT_B_ASSET_ID_OFFSET: number;
    static INPUT_ASSET_ID_B_OFFSET: number;
    static BITCONFIG_OFFSET: number;
    static AUX_DATA_OFFSET: number;
    constructor(addressId: number, inputAssetIdA: number, outputAssetIdA: number, outputAssetIdB: number, inputAssetIdB: number, bitConfig: BitConfig, auxData: number);
    static random(): BridgeId;
    static fromBigInt(val: bigint): BridgeId;
    static fromBuffer(buf: Buffer): BridgeId;
    static fromString(str: string): BridgeId;
    toBigInt(): bigint;
    toBuffer(): Buffer;
    toString(): string;
    equals(id: BridgeId): boolean;
}
//# sourceMappingURL=index.d.ts.map
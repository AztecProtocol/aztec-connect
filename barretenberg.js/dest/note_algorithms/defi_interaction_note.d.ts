/// <reference types="node" />
import { BridgeId } from '../bridge_id';
export declare class DefiInteractionNote {
    readonly bridgeId: BridgeId;
    readonly nonce: number;
    readonly totalInputValue: bigint;
    readonly totalOutputValueA: bigint;
    readonly totalOutputValueB: bigint;
    readonly result: boolean;
    static EMPTY: DefiInteractionNote;
    static LENGTH: number;
    static groupModulus: bigint;
    constructor(bridgeId: BridgeId, nonce: number, totalInputValue: bigint, totalOutputValueA: bigint, totalOutputValueB: bigint, result: boolean);
    static deserialize(buffer: Buffer, offset: number): {
        elem: DefiInteractionNote;
        adv: number;
    };
    static random(): DefiInteractionNote;
    static fromBuffer(buf: Buffer): DefiInteractionNote;
    toBuffer(): Buffer;
    equals(note: DefiInteractionNote): boolean;
}
export declare const computeInteractionHashes: (notes: DefiInteractionNote[], padTo?: number) => Buffer[];
export declare const packInteractionNotes: (notes: DefiInteractionNote[], padTo?: number) => Buffer;
//# sourceMappingURL=defi_interaction_note.d.ts.map
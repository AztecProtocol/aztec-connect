/// <reference types="node" />
import { BridgeId } from '../bridge_id';
export declare class TreeClaimNote {
    value: bigint;
    bridgeId: BridgeId;
    defiInteractionNonce: number;
    fee: bigint;
    partialState: Buffer;
    inputNullifier: Buffer;
    static EMPTY: TreeClaimNote;
    static LENGTH: number;
    constructor(value: bigint, bridgeId: BridgeId, defiInteractionNonce: number, fee: bigint, partialState: Buffer, inputNullifier: Buffer);
    static random(): TreeClaimNote;
    static fromBuffer(buf: Buffer): TreeClaimNote;
    toBuffer(): Buffer;
    equals(note: TreeClaimNote): boolean;
}
//# sourceMappingURL=tree_claim_note.d.ts.map
/// <reference types="node" />
import { ViewingKey } from '../viewing_key';
export declare class OffchainJoinSplitData {
    readonly viewingKeys: ViewingKey[];
    readonly txRefNo: number;
    static EMPTY: OffchainJoinSplitData;
    static SIZE: number;
    constructor(viewingKeys: ViewingKey[], txRefNo?: number);
    static fromBuffer(buf: Buffer): OffchainJoinSplitData;
    toBuffer(): Buffer;
}
//# sourceMappingURL=offchain_join_split_data.d.ts.map
/// <reference types="node" />
import { DefiInteractionNote } from '../note_algorithms';
import { TxHash } from '../blockchain';
export declare class Block {
    txHash: TxHash;
    created: Date;
    rollupId: number;
    rollupSize: number;
    rollupProofData: Buffer;
    offchainTxData: Buffer[];
    interactionResult: DefiInteractionNote[];
    gasUsed: number;
    gasPrice: bigint;
    constructor(txHash: TxHash, created: Date, rollupId: number, rollupSize: number, rollupProofData: Buffer, offchainTxData: Buffer[], interactionResult: DefiInteractionNote[], gasUsed: number, gasPrice: bigint);
    static deserialize(buf: Buffer, offset?: number): {
        elem: Block;
        adv: number;
    };
    static fromBuffer(buf: Buffer): Block;
    toBuffer(): Buffer;
}
export interface BlockSource {
    /**
     * Returns all blocks from rollup id `from`.
     * In the future this will *not* guarantee *all* blocks are returned. It may return a subset, and the
     * client should use `getLatestRollupId()` to determine if it needs to make further requests.
     */
    getBlocks(from: number): Promise<Block[]>;
    /**
     * Starts emitting rollup blocks.
     * All historical blocks must have been emitted before this function returns.
     */
    start(fromBlock?: number): any;
    stop(): Promise<void>;
    on(event: 'block', fn: (block: Block) => void): any;
    removeAllListeners(): any;
    getLatestRollupId(): number;
}
export * from './server_block_source';
//# sourceMappingURL=index.d.ts.map
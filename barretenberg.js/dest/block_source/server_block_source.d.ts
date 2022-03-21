/// <reference types="node" />
import { BlockSource, Block } from '.';
import { EventEmitter } from 'events';
export declare class ServerBlockSource extends EventEmitter implements BlockSource {
    private pollInterval;
    private running;
    private runningPromise;
    private interruptPromise;
    private interruptResolve;
    private latestRollupId;
    protected baseUrl: string;
    constructor(baseUrl: URL, pollInterval?: number);
    getLatestRollupId(): number;
    start(from?: number): Promise<void>;
    stop(): Promise<void>;
    private awaitSucceed;
    getBlocks(from: number): Promise<Block[]>;
    private sleepOrInterrupted;
}
//# sourceMappingURL=server_block_source.d.ts.map
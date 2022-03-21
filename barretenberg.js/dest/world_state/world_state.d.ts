/// <reference types="node" />
import { LevelUp } from 'levelup';
import { Pedersen } from '../crypto/pedersen';
import { RollupProofData } from '../rollup_proof';
export declare class WorldState {
    private db;
    private pedersen;
    private tree;
    constructor(db: LevelUp, pedersen: Pedersen);
    init(): Promise<void>;
    processRollup(rollup: RollupProofData): Promise<void>;
    processRollups(rollups: RollupProofData[]): Promise<void>;
    processNoteCommitments(dataStartIndex: number, notes: Buffer[]): Promise<void>;
    syncFromDb(): Promise<void>;
    getHashPath(index: number): Promise<import("../merkle_tree").HashPath>;
    getRoot(): Buffer;
    getSize(): number;
}
//# sourceMappingURL=world_state.d.ts.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldState = void 0;
const tslib_1 = require("tslib");
const merkle_tree_1 = require("../merkle_tree");
const debug_1 = (0, tslib_1.__importDefault)(require("debug"));
const debug = (0, debug_1.default)('bb:world_state');
class WorldState {
    constructor(db, pedersen) {
        this.db = db;
        this.pedersen = pedersen;
    }
    async init() {
        try {
            this.tree = await merkle_tree_1.MerkleTree.fromName(this.db, this.pedersen, 'data');
        }
        catch (e) {
            this.tree = await merkle_tree_1.MerkleTree.new(this.db, this.pedersen, 'data', 32);
        }
        debug(`data size: ${this.tree.getSize()}`);
        debug(`data root: ${this.tree.getRoot().toString('hex')}`);
    }
    async processRollup(rollup) {
        const { rollupId, dataStartIndex, innerProofData } = rollup;
        debug(`processing rollup ${rollupId}, inner proof data length ${innerProofData.length}`);
        const leaves = innerProofData.map(p => [p.noteCommitment1, p.noteCommitment2]).flat();
        await this.tree.updateElements(dataStartIndex, leaves);
        debug(`data size: ${this.tree.getSize()}`);
        debug(`data root: ${this.tree.getRoot().toString('hex')}`);
    }
    async processRollups(rollups) {
        debug(`processing ${rollups.length} rollups from rollup ${rollups[0].rollupId}...`);
        let dataStartIndex = rollups[0].dataStartIndex;
        let leaves = [];
        for (const rollup of rollups) {
            if (rollup.dataStartIndex > dataStartIndex + leaves.length) {
                const padding = rollup.dataStartIndex - leaves.length;
                leaves.push(...new Array(padding).fill(Buffer.alloc(64, 0)));
            }
            leaves.push(...rollup.innerProofData.map(p => [p.noteCommitment1, p.noteCommitment2]).flat());
        }
        // Slice off any entries that already exist. Assumes that the values being removed are the same as already existing.
        const currentSize = this.tree.getSize();
        if (currentSize > dataStartIndex) {
            leaves = leaves.slice(currentSize - dataStartIndex);
            dataStartIndex = currentSize;
        }
        await this.tree.updateElements(dataStartIndex, leaves);
        debug(`data size: ${this.tree.getSize()}`);
        debug(`data root: ${this.tree.getRoot().toString('hex')}`);
    }
    async processNoteCommitments(dataStartIndex, notes) {
        debug(`Processing ${notes.length} note commitments with start index ${dataStartIndex}`);
        await this.tree.updateElements(dataStartIndex, notes);
        debug(`data size: ${this.tree.getSize()}`);
        debug(`data root: ${this.tree.getRoot().toString('hex')}`);
    }
    async syncFromDb() {
        await this.tree.syncFromDb();
    }
    async getHashPath(index) {
        return await this.tree.getHashPath(index);
    }
    getRoot() {
        return this.tree.getRoot();
    }
    getSize() {
        return this.tree.getSize();
    }
}
exports.WorldState = WorldState;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ybGRfc3RhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvd29ybGRfc3RhdGUvd29ybGRfc3RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLGdEQUE0QztBQUk1QywrREFBZ0M7QUFFaEMsTUFBTSxLQUFLLEdBQUcsSUFBQSxlQUFXLEVBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUU1QyxNQUFhLFVBQVU7SUFHckIsWUFBb0IsRUFBVyxFQUFVLFFBQWtCO1FBQXZDLE9BQUUsR0FBRixFQUFFLENBQVM7UUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFVO0lBQUcsQ0FBQztJQUV4RCxLQUFLLENBQUMsSUFBSTtRQUNmLElBQUk7WUFDRixJQUFJLENBQUMsSUFBSSxHQUFHLE1BQU0sd0JBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ3ZFO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixJQUFJLENBQUMsSUFBSSxHQUFHLE1BQU0sd0JBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztTQUN0RTtRQUNELEtBQUssQ0FBQyxjQUFjLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLEtBQUssQ0FBQyxjQUFjLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRU0sS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUF1QjtRQUNoRCxNQUFNLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsR0FBRyxNQUFNLENBQUM7UUFFNUQsS0FBSyxDQUFDLHFCQUFxQixRQUFRLDZCQUE2QixjQUFjLENB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
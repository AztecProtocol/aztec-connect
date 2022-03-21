"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PooledPedersen = void 0;
const pedersen_1 = require("./pedersen");
// import createDebug from 'debug';
// const debug = createDebug('bb:pooled_pedersen');
/**
 * Multi-threaded implementation of pedersen.
 */
class PooledPedersen extends pedersen_1.Pedersen {
    /**
     * @param wasm Synchronous functions will use use this wasm directly on the calling thread.
     * @param pool Asynchronous functions use this pool of workers to multi-thread processing.
     */
    constructor(wasm, pool) {
        super(wasm);
        this.pool = [];
        this.pool = pool.workers.map(w => new pedersen_1.Pedersen(wasm, w));
    }
    async init() {
        await Promise.all(this.pool.map(p => p.init()));
    }
    async hashToTree(values) {
        const isPowerOf2 = (v) => v && !(v & (v - 1));
        if (!isPowerOf2(values.length)) {
            throw new Error('PooledPedersen::hashValuesToTree can only handle powers of 2.');
        }
        const workers = this.pool.slice(0, Math.min(values.length / 2, this.pool.length));
        const numPerThread = values.length / workers.length;
        const results = await Promise.all(workers.map((pedersen, i) => pedersen.hashToTree(values.slice(i * numPerThread, (i + 1) * numPerThread))));
        const sliced = results.map(hashes => {
            const treeHashes = [];
            for (let i = numPerThread, j = 0; i >= 1; j += i, i /= 2) {
                treeHashes.push(hashes.slice(j, j + i));
            }
            return treeHashes;
        });
        const flattened = sliced[0];
        for (let i = 1; i < sliced.length; ++i) {
            for (let j = 0; j < sliced[i].length; ++j) {
                flattened[j] = [...flattened[j], ...sliced[i][j]];
            }
        }
        while (flattened[flattened.length - 1].length > 1) {
            const lastRow = flattened[flattened.length - 1];
            const newRow = [];
            for (let i = 0; i < lastRow.length; i += 2) {
                newRow[i / 2] = this.pool[0].compress(lastRow[i], lastRow[i + 1]);
            }
            flattened.push(newRow);
        }
        return flattened.flat();
    }
}
exports.PooledPedersen = PooledPedersen;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9vbGVkX3BlZGVyc2VuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NyeXB0by9wZWRlcnNlbi9wb29sZWRfcGVkZXJzZW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEseUNBQXNDO0FBR3RDLG1DQUFtQztBQUVuQyxtREFBbUQ7QUFFbkQ7O0dBRUc7QUFDSCxNQUFhLGNBQWUsU0FBUSxtQkFBUTtJQUcxQzs7O09BR0c7SUFDSCxZQUFZLElBQXNCLEVBQUUsSUFBZ0I7UUFDbEQsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBUFAsU0FBSSxHQUFlLEVBQUUsQ0FBQztRQVEzQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxtQkFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFTSxLQUFLLENBQUMsSUFBSTtRQUNmLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVNLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBZ0I7UUFDdEMsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDOUIsTUFBTSxJQUFJLEtBQUssQ0FBQywrREFBK0QsQ0FBQyxDQUFDO1NBQ2xGO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElB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
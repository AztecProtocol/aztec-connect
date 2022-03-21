"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerPool = void 0;
const tslib_1 = require("tslib");
const debug_1 = (0, tslib_1.__importDefault)(require("debug"));
const worker_factory_1 = require("./worker_factory");
const debug = (0, debug_1.default)('bb:worker_pool');
class WorkerPool {
    constructor() {
        this.workers = [];
    }
    static async new(barretenberg, poolSize) {
        const pool = new WorkerPool();
        await pool.init(barretenberg.module, poolSize);
        return pool;
    }
    async init(module, poolSize) {
        debug(`creating ${poolSize} workers...`);
        const start = new Date().getTime();
        this.workers = await Promise.all(Array(poolSize)
            .fill(0)
            .map((_, i) => (0, worker_factory_1.createWorker)(`${i}`, module, i === 0 ? 10000 : 256)));
        debug(`created workers: ${new Date().getTime() - start}ms`);
    }
    async destroy() {
        await Promise.all(this.workers.map(worker_factory_1.destroyWorker));
    }
}
exports.WorkerPool = WorkerPool;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyX3Bvb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvd2FzbS93b3JrZXJfcG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBRUEsK0RBQWdDO0FBQ2hDLHFEQUErRDtBQUcvRCxNQUFNLEtBQUssR0FBRyxJQUFBLGVBQVcsRUFBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBRTVDLE1BQWEsVUFBVTtJQUF2QjtRQUNTLFlBQU8sR0FBdUMsRUFBRSxDQUFDO0lBc0IxRCxDQUFDO0lBcEJDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQThCLEVBQUUsUUFBZ0I7UUFDL0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUM5QixNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMvQyxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFTSxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQTBCLEVBQUUsUUFBZ0I7UUFDNUQsS0FBSyxDQUFDLFlBQVksUUFBUSxhQUFhLENBQUMsQ0FBQztRQUN6QyxNQUFNLEtBQUssR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ25DLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUM5QixLQUFLLENBQUMsUUFBUSxDQUFDO2FBQ1osSUFBSSxDQUFDLENBQUMsQ0FBQzthQUNQLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUEsNkJBQVksRUFBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQ3RFLENBQUM7UUFDRixLQUFLLENBQUMsb0JBQW9CLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsS0FBSyxJQUFJLENBQUMsQ0FBQztJQUM5RCxDQUFDO0lBRU0sS0FBSyxDQUFDLE9BQU87UUFDbEIsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUFhLENBQUMsQ0FBQyxDQUFDO0lBQ3JELENBQUM7Q0FDRjtBQXZCRCxnQ0F1QkMifQ==
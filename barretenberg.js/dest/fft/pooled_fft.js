"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PooledFft = void 0;
const tslib_1 = require("tslib");
const debug_1 = (0, tslib_1.__importDefault)(require("debug"));
const fifo_1 = require("../fifo");
const single_fft_1 = require("./single_fft");
const debug = (0, debug_1.default)('bb:fft');
class PooledFft {
    constructor(pool) {
        this.queue = new fifo_1.MemoryFifo();
        this.ffts = pool.workers.map(w => new single_fft_1.SingleFft(w));
    }
    async init(circuitSize) {
        const start = new Date().getTime();
        debug(`initializing fft of size: ${circuitSize}`);
        await Promise.all(this.ffts.map(f => f.init(circuitSize)));
        this.ffts.forEach(async (w) => this.processJobs(w));
        debug(`initialization took: ${new Date().getTime() - start}ms`);
    }
    async destroy() {
        this.queue.cancel();
        await Promise.all(this.ffts.map(f => f.destroy()));
    }
    async processJobs(worker) {
        while (true) {
            const job = await this.queue.get();
            if (!job) {
                break;
            }
            const result = await (job.inverse ? worker.ifft(job.coefficients) : worker.fft(job.coefficients, job.constant));
            job.resolve(result);
        }
    }
    async fft(coefficients, constant) {
        return await new Promise(resolve => this.queue.put({ coefficients, constant, inverse: false, resolve }));
    }
    async ifft(coefficients) {
        return await new Promise(resolve => this.queue.put({ coefficients, inverse: true, resolve }));
    }
}
exports.PooledFft = PooledFft;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9vbGVkX2ZmdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9mZnQvcG9vbGVkX2ZmdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsK0RBQWdDO0FBRWhDLGtDQUFxQztBQUNyQyw2Q0FBeUM7QUFHekMsTUFBTSxLQUFLLEdBQUcsSUFBQSxlQUFXLEVBQUMsUUFBUSxDQUFDLENBQUM7QUFTcEMsTUFBYSxTQUFTO0lBSXBCLFlBQVksSUFBZ0I7UUFIcEIsVUFBSyxHQUFHLElBQUksaUJBQVUsRUFBTyxDQUFDO1FBSXBDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLHNCQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRU0sS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFtQjtRQUNuQyxNQUFNLEtBQUssR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ25DLEtBQUssQ0FBQyw2QkFBNkIsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUNsRCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEQsS0FBSyxDQUFDLHdCQUF3QixJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLEtBQUssSUFBSSxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVNLEtBQUssQ0FBQyxPQUFPO1FBQ2xCLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDcEIsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRU8sS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFpQjtRQUN6QyxPQUFPLElBQUksRUFBRTtZQUNYLE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNuQyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUNSLE1BQU07YUFDUDtZQUNELE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxRQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ2pILEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDckI7SUFDSCxDQUFDO0lBRU0sS0FBSyxDQUFDLEdBQUcsQ0FBQyxZQUF3QixFQUFFLFFBQW9CO1FBQzdELE9BQU8sTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMzRyxDQUFDO0lBRU0sS0FBSyxDQUFDLElBQUksQ0FBQyxZQUF3QjtRQUN4QyxPQUFPLE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNoRyxDQUFDO0NBQ0Y7QUF2Q0QsOEJBdUNDIn0=
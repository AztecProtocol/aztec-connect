"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PooledPippenger = void 0;
const tslib_1 = require("tslib");
const single_pippenger_1 = require("./single_pippenger");
const debug_1 = (0, tslib_1.__importDefault)(require("debug"));
const debug = (0, debug_1.default)('bb:pippenger');
class PooledPippenger {
    constructor() {
        this.pool = [];
    }
    async init(crsData, pool) {
        const start = new Date().getTime();
        debug(`initializing: ${new Date().getTime() - start}ms`);
        this.pool = await Promise.all(pool.workers.map(async (w) => {
            const p = new single_pippenger_1.SinglePippenger(w);
            await p.init(crsData);
            return p;
        }));
        debug(`initialization took: ${new Date().getTime() - start}ms`);
    }
    async pippengerUnsafe(scalars, from, range) {
        const scalarsPerWorker = range / this.pool.length;
        const start = new Date().getTime();
        const results = await Promise.all(this.pool.map((p, i) => {
            const subset = scalars.slice(scalarsPerWorker * i * 32, scalarsPerWorker * (i + 1) * 32);
            return p.pippengerUnsafe(subset, scalarsPerWorker * i, scalarsPerWorker);
        }));
        debug(`pippenger run took: ${new Date().getTime() - start}ms`);
        return await this.sumElements(Buffer.concat(results));
    }
    async sumElements(buffer) {
        return this.pool[0].sumElements(buffer);
    }
}
exports.PooledPippenger = PooledPippenger;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9vbGVkX3BpcHBlbmdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9waXBwZW5nZXIvcG9vbGVkX3BpcHBlbmdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQ0EseURBQXFEO0FBQ3JELCtEQUFnQztBQUdoQyxNQUFNLEtBQUssR0FBRyxJQUFBLGVBQVcsRUFBQyxjQUFjLENBQUMsQ0FBQztBQUUxQyxNQUFhLGVBQWU7SUFBNUI7UUFDUyxTQUFJLEdBQXNCLEVBQUUsQ0FBQztJQStCdEMsQ0FBQztJQTdCUSxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQW1CLEVBQUUsSUFBZ0I7UUFDckQsTUFBTSxLQUFLLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNuQyxLQUFLLENBQUMsaUJBQWlCLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsS0FBSyxJQUFJLENBQUMsQ0FBQztRQUN6RCxJQUFJLENBQUMsSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FDM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxFQUFFO1lBQ3pCLE1BQU0sQ0FBQyxHQUFHLElBQUksa0NBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdEIsT0FBTyxDQUFDLENBQUM7UUFDWCxDQUFDLENBQUMsQ0FDSCxDQUFDO1FBQ0YsS0FBSyxDQUFDLHdCQUF3QixJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLEtBQUssSUFBSSxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVNLEtBQUssQ0FBQyxlQUFlLENBQUMsT0FBbUIsRUFBRSxJQUFZLEVBQUUsS0FBYTtRQUMzRSxNQUFNLGdCQUFnQixHQUFHLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUNsRCxNQUFNLEtBQUssR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ25DLE1BQU0sT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDckIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFLGdCQUFnQixHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQ3pGLE9BQU8sQ0FBQyxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLEdBQUcsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDM0UsQ0FBQyxDQUFDLENBQ0gsQ0FBQztRQUNGLEtBQUssQ0FBQyx1QkFBdUIsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxLQUFLLElBQUksQ0FBQyxDQUFDO1FBQy9ELE9BQU8sTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRU0sS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFrQjtRQUN6QyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzFDLENBQUM7Q0FDRjtBQWhDRCwwQ0FnQ0MifQ==
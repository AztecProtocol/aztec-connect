"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PooledProverFactory = void 0;
const prover_1 = require("./prover");
const pippenger_1 = require("../../pippenger");
const fft_1 = require("../../fft");
const unrolled_prover_1 = require("./unrolled_prover");
class PooledProverFactory {
    constructor(pool, crsData) {
        this.pool = pool;
        this.crsData = crsData;
        this.fft = {};
    }
    async init(circuitSize) {
        if (!this.pippenger) {
            const pippenger = new pippenger_1.PooledPippenger();
            await pippenger.init(this.crsData, this.pool);
            this.pippenger = pippenger;
        }
        if (!this.fft[circuitSize]) {
            const fft = new fft_1.PooledFft(this.pool);
            await fft.init(circuitSize);
            this.fft[circuitSize] = fft;
        }
    }
    async createProver(circuitSize) {
        await this.init(circuitSize);
        return new prover_1.Prover(this.pool.workers[0], this.pippenger, this.fft[circuitSize]);
    }
    async createUnrolledProver(circuitSize) {
        await this.init(circuitSize);
        return new unrolled_prover_1.UnrolledProver(this.pool.workers[0], this.pippenger, this.fft[circuitSize]);
    }
}
exports.PooledProverFactory = PooledProverFactory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9vbGVkX3Byb3Zlcl9mYWN0b3J5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NsaWVudF9wcm9vZnMvcHJvdmVyL3Bvb2xlZF9wcm92ZXJfZmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxQ0FBa0M7QUFFbEMsK0NBQWtEO0FBQ2xELG1DQUEyQztBQUMzQyx1REFBbUQ7QUFFbkQsTUFBYSxtQkFBbUI7SUFJOUIsWUFBb0IsSUFBZ0IsRUFBVSxPQUFtQjtRQUE3QyxTQUFJLEdBQUosSUFBSSxDQUFZO1FBQVUsWUFBTyxHQUFQLE9BQU8sQ0FBWTtRQUZ6RCxRQUFHLEdBQTJCLEVBQUUsQ0FBQztJQUUyQixDQUFDO0lBRTdELEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBbUI7UUFDcEMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDbkIsTUFBTSxTQUFTLEdBQUcsSUFBSSwyQkFBZSxFQUFFLENBQUM7WUFDeEMsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlDLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1NBQzVCO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFDMUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxlQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3JDLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUM1QixJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztTQUM3QjtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsWUFBWSxDQUFDLFdBQW1CO1FBQ3BDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM3QixPQUFPLElBQUksZUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFVLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQ2xGLENBQUM7SUFFRCxLQUFLLENBQUMsb0JBQW9CLENBQUMsV0FBbUI7UUFDNUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzdCLE9BQU8sSUFBSSxnQ0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFVLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQzFGLENBQUM7Q0FDRjtBQTdCRCxrREE2QkMifQ==
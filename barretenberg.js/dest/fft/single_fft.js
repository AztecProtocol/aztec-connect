"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SingleFft = void 0;
const threads_1 = require("threads");
class SingleFft {
    constructor(wasm) {
        this.wasm = wasm;
    }
    async init(circuitSize) {
        this.domainPtr = await this.wasm.call('new_evaluation_domain', circuitSize);
    }
    async destroy() {
        await this.wasm.call('delete_evaluation_domain', this.domainPtr);
    }
    async fft(coefficients, constant) {
        const circuitSize = coefficients.length / 32;
        const newPtr = await this.wasm.call('bbmalloc', coefficients.length);
        await this.wasm.transferToHeap((0, threads_1.Transfer)(coefficients, [coefficients.buffer]), newPtr);
        await this.wasm.transferToHeap((0, threads_1.Transfer)(constant, [constant.buffer]), 0);
        await this.wasm.call('coset_fft_with_generator_shift', newPtr, 0, this.domainPtr);
        const result = await this.wasm.sliceMemory(newPtr, newPtr + circuitSize * 32);
        await this.wasm.call('bbfree', newPtr);
        return result;
    }
    async ifft(coefficients) {
        const circuitSize = coefficients.length / 32;
        const newPtr = await this.wasm.call('bbmalloc', coefficients.length);
        await this.wasm.transferToHeap((0, threads_1.Transfer)(coefficients, [coefficients.buffer]), newPtr);
        await this.wasm.call('ifft', newPtr, this.domainPtr);
        const result = await this.wasm.sliceMemory(newPtr, newPtr + circuitSize * 32);
        await this.wasm.call('bbfree', newPtr);
        return result;
    }
}
exports.SingleFft = SingleFft;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2luZ2xlX2ZmdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9mZnQvc2luZ2xlX2ZmdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxxQ0FBbUM7QUFHbkMsTUFBYSxTQUFTO0lBR3BCLFlBQW9CLElBQXdCO1FBQXhCLFNBQUksR0FBSixJQUFJLENBQW9CO0lBQUcsQ0FBQztJQUV6QyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQW1CO1FBQ25DLElBQUksQ0FBQyxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUM5RSxDQUFDO0lBRU0sS0FBSyxDQUFDLE9BQU87UUFDbEIsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbkUsQ0FBQztJQUVNLEtBQUssQ0FBQyxHQUFHLENBQUMsWUFBd0IsRUFBRSxRQUFvQjtRQUM3RCxNQUFNLFdBQVcsR0FBRyxZQUFZLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUM3QyxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDckUsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFBLGtCQUFRLEVBQUMsWUFBWSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDN0YsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFBLGtCQUFRLEVBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDaEYsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNsRixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsV0FBVyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQzlFLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZDLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFFTSxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQXdCO1FBQ3hDLE1BQU0sV0FBVyxHQUFHLFlBQVksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBQzdDLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyRSxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUEsa0JBQVEsRUFBQyxZQUFZLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM3RixNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxXQUFXLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDOUUsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdkMsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztDQUNGO0FBakNELDhCQWlDQyJ9
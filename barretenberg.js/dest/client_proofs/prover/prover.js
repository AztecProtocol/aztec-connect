"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Prover = void 0;
const tslib_1 = require("tslib");
const debug_1 = (0, tslib_1.__importDefault)(require("debug"));
const debug = (0, debug_1.default)('bb:prover');
class Timer {
    constructor(msg) {
        debug(msg);
        this.start = new Date().getTime();
    }
    mark(msg) {
        const diff = new Date().getTime() - this.start;
        debug(`${msg} (ms:${diff})`);
        this.start = new Date().getTime();
    }
}
/**
 * A Prover is composed of a single underlying worker (`wasm`), and implementations of Pippenger and Fft, which may
 * or may not be backed multiple wasm workers on which they execute their algorithms.
 *
 * The single given worker, must be the worker within which any proof generators will initialise their proving keys,
 * and must be the worker within which the given `proverPtr` exists.
 *
 * The `getWorker()` method should be used by proof generation components to return the worker on which to make their
 * appropriate wasmCalls.
 *
 * Given that the Fft implementation is provided in the constructor, a Prover is fixed to whatever circuit size the
 * Fft implementation was initialised with.
 */
class Prover {
    constructor(wasm, pippenger, fft, callPrefix = '') {
        this.wasm = wasm;
        this.pippenger = pippenger;
        this.fft = fft;
        this.callPrefix = callPrefix;
    }
    getWorker() {
        return this.wasm;
    }
    proverCall(name, ...args) {
        return this.wasm.call(this.callPrefix + name, ...args);
    }
    async createProof(proverPtr) {
        await this.wasm.acquire();
        try {
            const circuitSize = await this.proverCall('prover_get_circuit_size', proverPtr);
            const timer = new Timer('enter createProof');
            await this.proverCall('prover_execute_preamble_round', proverPtr);
            timer.mark('preamble end');
            await this.processProverQueue(proverPtr, circuitSize);
            timer.mark('first round start');
            await this.proverCall('prover_execute_first_round', proverPtr);
            timer.mark('first round end');
            await this.processProverQueue(proverPtr, circuitSize);
            timer.mark('second round start');
            await this.proverCall('prover_execute_second_round', proverPtr);
            timer.mark('second round end');
            await this.processProverQueue(proverPtr, circuitSize);
            timer.mark('third round start');
            await this.proverCall('prover_execute_third_round', proverPtr);
            timer.mark('third round end');
            await this.processProverQueue(proverPtr, circuitSize);
            timer.mark('fourth round start');
            await this.proverCall('prover_execute_fourth_round', proverPtr);
            timer.mark('fourth round end');
            await this.processProverQueue(proverPtr, circuitSize);
            timer.mark('fifth round start');
            await this.proverCall('prover_execute_fifth_round', proverPtr);
            timer.mark('fifth round end');
            timer.mark('sixth round start');
            await this.proverCall('prover_execute_sixth_round', proverPtr);
            timer.mark('sixth round end');
            await this.processProverQueue(proverPtr, circuitSize);
            timer.mark('done');
            const proofSize = await this.proverCall('prover_export_proof', proverPtr, 0);
            const proofPtr = Buffer.from(await this.wasm.sliceMemory(0, 4)).readUInt32LE(0);
            return Buffer.from(await this.wasm.sliceMemory(proofPtr, proofPtr + proofSize));
        }
        finally {
            await this.wasm.release();
        }
    }
    async processProverQueue(proverPtr, circuitSize) {
        await this.proverCall('prover_get_work_queue_item_info', proverPtr, 0);
        const jobInfo = Buffer.from(await this.wasm.sliceMemory(0, 12));
        const scalarJobs = jobInfo.readUInt32LE(0);
        const fftJobs = jobInfo.readUInt32LE(4);
        const ifftJobs = jobInfo.readUInt32LE(8);
        debug(`starting jobs scalars:${scalarJobs} ffts:${fftJobs} iffts:${ifftJobs}`);
        for (let i = 0; i < scalarJobs; ++i) {
            const scalarsPtr = await this.proverCall('prover_get_scalar_multiplication_data', proverPtr, i);
            const scalars = await this.wasm.sliceMemory(scalarsPtr, scalarsPtr + circuitSize * 32);
            const result = await this.pippenger.pippengerUnsafe(scalars, 0, circuitSize);
            await this.wasm.transferToHeap(result, 0);
            await this.proverCall('prover_put_scalar_multiplication_data', proverPtr, 0, i);
        }
        const jobs = [];
        for (let i = 0; i < fftJobs; ++i) {
            const coeffsPtr = await this.proverCall('prover_get_fft_data', proverPtr, 0, i);
            const coefficients = await this.wasm.sliceMemory(coeffsPtr, coeffsPtr + circuitSize * 32);
            const constant = await this.wasm.sliceMemory(0, 32);
            jobs.push({ coefficients, constant, inverse: false, i });
        }
        for (let i = 0; i < ifftJobs; ++i) {
            const coeffsPtr = await this.proverCall('prover_get_ifft_data', proverPtr, i);
            const coefficients = await this.wasm.sliceMemory(coeffsPtr, coeffsPtr + circuitSize * 32);
            jobs.push({ coefficients, inverse: true, i });
        }
        await Promise.all(jobs.map(({ inverse, coefficients, constant, i }) => inverse
            ? this.doIfft(proverPtr, i, circuitSize, coefficients)
            : this.doFft(proverPtr, i, circuitSize, coefficients, constant)));
    }
    async doFft(proverPtr, i, circuitSize, coefficients, constant) {
        const result = await this.fft.fft(coefficients, constant);
        const resultPtr = await this.wasm.call('bbmalloc', circuitSize * 32);
        await this.wasm.transferToHeap(result, resultPtr);
        await this.proverCall('prover_put_fft_data', proverPtr, resultPtr, i);
        await this.wasm.call('bbfree', resultPtr);
    }
    async doIfft(proverPtr, i, circuitSize, coefficients) {
        const result = await this.fft.ifft(coefficients);
        const resultPtr = await this.wasm.call('bbmalloc', circuitSize * 32);
        await this.wasm.transferToHeap(result, resultPtr);
        await this.proverCall('prover_put_ifft_data', proverPtr, resultPtr, i);
        await this.wasm.call('bbfree', resultPtr);
    }
}
exports.Prover = Prover;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NsaWVudF9wcm9vZnMvcHJvdmVyL3Byb3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBRUEsK0RBQWdDO0FBR2hDLE1BQU0sS0FBSyxHQUFHLElBQUEsZUFBVyxFQUFDLFdBQVcsQ0FBQyxDQUFDO0FBRXZDLE1BQU0sS0FBSztJQUdULFlBQVksR0FBVztRQUNyQixLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDWCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDcEMsQ0FBQztJQUVNLElBQUksQ0FBQyxHQUFXO1FBQ3JCLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUMvQyxLQUFLLENBQUMsR0FBRyxHQUFHLFFBQVEsSUFBSSxHQUFHLENBQUMsQ0FBQztRQUM3QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDcEMsQ0FBQztDQUNGO0FBRUQ7Ozs7Ozs7Ozs7OztHQVlHO0FBQ0gsTUFBYSxNQUFNO0lBQ2pCLFlBQ1UsSUFBd0IsRUFDeEIsU0FBb0IsRUFDcEIsR0FBUSxFQUNSLGFBQWEsRUFBRTtRQUhmLFNBQUksR0FBSixJQUFJLENBQW9CO1FBQ3hCLGNBQVMsR0FBVCxTQUFTLENBQVc7UUFDcEIsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUNSLGVBQVUsR0FBVixVQUFVLENBQUs7SUFDdEIsQ0FBQztJQUVHLFNBQVM7UUFDZCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDbkIsQ0FBQztJQUVPLFVBQVUsQ0FBQyxJQUFZLEVBQUUsR0FBRyxJQUFXO1FBQzdDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUs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
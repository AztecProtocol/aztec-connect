"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JoinSplitProver = void 0;
const threads_1 = require("threads");
class JoinSplitProver {
    constructor(prover, mock = false) {
        this.prover = prover;
        this.mock = mock;
    }
    async computeKey() {
        const worker = this.prover.getWorker();
        await worker.call('join_split__init_proving_key', this.mock);
    }
    async loadKey(keyBuf) {
        const worker = this.prover.getWorker();
        const keyPtr = await worker.call('bbmalloc', keyBuf.length);
        await worker.transferToHeap((0, threads_1.Transfer)(keyBuf, [keyBuf.buffer]), keyPtr);
        await worker.call('join_split__init_proving_key_from_buffer', keyPtr);
        await worker.call('bbfree', keyPtr);
    }
    async getKey() {
        const worker = this.prover.getWorker();
        await worker.acquire();
        try {
            const keySize = await worker.call('join_split__get_new_proving_key_data', 0);
            const keyPtr = Buffer.from(await worker.sliceMemory(0, 4)).readUInt32LE(0);
            const buf = Buffer.from(await worker.sliceMemory(keyPtr, keyPtr + keySize));
            await worker.call('bbfree', keyPtr);
            return buf;
        }
        finally {
            await worker.release();
        }
    }
    async computeSigningData(tx) {
        const worker = this.prover.getWorker();
        await worker.transferToHeap(tx.toBuffer(), 0);
        await worker.call('join_split__compute_signing_data', 0, 0);
        return Buffer.from(await worker.sliceMemory(0, 32));
    }
    async createProof(tx, signature) {
        const buf = Buffer.concat([tx.toBuffer(), signature.toBuffer()]);
        const worker = this.prover.getWorker();
        const mem = await worker.call('bbmalloc', buf.length);
        await worker.transferToHeap(buf, mem);
        const proverPtr = await worker.call('join_split__new_prover', mem, this.mock);
        await worker.call('bbfree', mem);
        const proof = await this.prover.createProof(proverPtr);
        await worker.call('join_split__delete_prover', proverPtr);
        return proof;
    }
    getProver() {
        return this.prover;
    }
}
exports.JoinSplitProver = JoinSplitProver;
JoinSplitProver.circuitSize = 64 * 1024;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiam9pbl9zcGxpdF9wcm92ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY2xpZW50X3Byb29mcy9qb2luX3NwbGl0X3Byb29mL2pvaW5fc3BsaXRfcHJvdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFDQUFtQztBQUtuQyxNQUFhLGVBQWU7SUFDMUIsWUFBb0IsTUFBc0IsRUFBa0IsT0FBTyxLQUFLO1FBQXBELFdBQU0sR0FBTixNQUFNLENBQWdCO1FBQWtCLFNBQUksR0FBSixJQUFJLENBQVE7SUFBRyxDQUFDO0lBSXJFLEtBQUssQ0FBQyxVQUFVO1FBQ3JCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDdkMsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLDhCQUE4QixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRU0sS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFjO1FBQ2pDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDdkMsTUFBTSxNQUFNLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUQsTUFBTSxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUEsa0JBQVEsRUFBQyxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM5RSxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsMENBQTBDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdEUsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRU0sS0FBSyxDQUFDLE1BQU07UUFDakIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUN2QyxNQUFNLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN2QixJQUFJO1lBQ0YsTUFBTSxPQUFPLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzdFLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzRSxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDNUUsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNwQyxPQUFPLEdBQUcsQ0FBQztTQUNaO2dCQUFTO1lBQ1IsTUFBTSxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7U0FDeEI7SUFDSCxDQUFDO0lBRU0sS0FBSyxDQUFDLGtCQUFrQixDQUFDLEVBQWU7UUFDN0MsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUN2QyxNQUFNLE1BQU0sQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUQsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRU0sS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFlLEVBQUUsU0FBMkI7UUFDbkUsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDdkMsTUFBTSxHQUFHLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEQsTUFBTSxNQUFNLENBQUMsY0FBYyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN0QyxNQUFNLFNBQVMsR0FBRyxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5RSxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkQsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzFELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVNLFNBQVM7UUFDZCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDckIsQ0FBQzs7QUFyREgsMENBc0RDO0FBbkRRLDJCQUFXLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyJ9
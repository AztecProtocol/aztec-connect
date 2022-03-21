"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountProver = void 0;
const threads_1 = require("threads");
class AccountProver {
    constructor(prover, mock = false) {
        this.prover = prover;
        this.mock = mock;
    }
    async computeKey() {
        const worker = this.prover.getWorker();
        await worker.call('account__init_proving_key', this.mock);
    }
    async loadKey(keyBuf) {
        const worker = this.prover.getWorker();
        const keyPtr = await worker.call('bbmalloc', keyBuf.length);
        await worker.transferToHeap((0, threads_1.Transfer)(keyBuf, [keyBuf.buffer]), keyPtr);
        await worker.call('account__init_proving_key_from_buffer', keyPtr);
        await worker.call('bbfree', keyPtr);
    }
    async getKey() {
        const worker = this.prover.getWorker();
        await worker.acquire();
        try {
            const keySize = await worker.call('account__get_new_proving_key_data', 0);
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
        await worker.call('account__compute_signing_data', 0, 0);
        return Buffer.from(await worker.sliceMemory(0, 32));
    }
    async createAccountProof(tx, signature) {
        const worker = this.prover.getWorker();
        const buf = Buffer.concat([tx.toBuffer(), signature.toBuffer()]);
        const mem = await worker.call('bbmalloc', buf.length);
        await worker.transferToHeap(buf, mem);
        const proverPtr = await worker.call('account__new_prover', mem, this.mock);
        await worker.call('bbfree', mem);
        const proof = await this.prover.createProof(proverPtr);
        await worker.call('account__delete_prover', proverPtr);
        return proof;
    }
    getProver() {
        return this.prover;
    }
}
exports.AccountProver = AccountProver;
AccountProver.circuitSize = 32 * 1024;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjb3VudF9wcm92ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY2xpZW50X3Byb29mcy9hY2NvdW50X3Byb29mL2FjY291bnRfcHJvdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFDQUFtQztBQUtuQyxNQUFhLGFBQWE7SUFDeEIsWUFBb0IsTUFBc0IsRUFBa0IsT0FBTyxLQUFLO1FBQXBELFdBQU0sR0FBTixNQUFNLENBQWdCO1FBQWtCLFNBQUksR0FBSixJQUFJLENBQVE7SUFBRyxDQUFDO0lBSXJFLEtBQUssQ0FBQyxVQUFVO1FBQ3JCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDdkMsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM1RCxDQUFDO0lBRU0sS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFjO1FBQ2pDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDdkMsTUFBTSxNQUFNLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUQsTUFBTSxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUEsa0JBQVEsRUFBQyxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM5RSxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsdUNBQXVDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbkUsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRU0sS0FBSyxDQUFDLE1BQU07UUFDakIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFT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
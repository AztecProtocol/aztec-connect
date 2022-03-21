/// <reference types="node" />
import { BarretenbergWorker } from '../../wasm/worker';
import { SinglePippenger } from '../../pippenger';
export declare class JoinSplitVerifier {
    private worker;
    computeKey(pippenger: SinglePippenger, g2Data: Uint8Array): Promise<void>;
    getKey(): Promise<Buffer>;
    loadKey(worker: BarretenbergWorker, keyBuf: Buffer, g2Data: Uint8Array): Promise<void>;
    verifyProof(proof: Buffer): Promise<boolean>;
}
//# sourceMappingURL=join_split_verifier.d.ts.map
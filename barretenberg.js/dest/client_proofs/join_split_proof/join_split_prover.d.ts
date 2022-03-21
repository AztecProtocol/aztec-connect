/// <reference types="node" />
import { SchnorrSignature } from '../../crypto';
import { UnrolledProver } from '../prover';
import { JoinSplitTx } from './join_split_tx';
export declare class JoinSplitProver {
    private prover;
    readonly mock: boolean;
    constructor(prover: UnrolledProver, mock?: boolean);
    static circuitSize: number;
    computeKey(): Promise<void>;
    loadKey(keyBuf: Buffer): Promise<void>;
    getKey(): Promise<Buffer>;
    computeSigningData(tx: JoinSplitTx): Promise<Buffer>;
    createProof(tx: JoinSplitTx, signature: SchnorrSignature): Promise<Buffer>;
    getProver(): UnrolledProver;
}
//# sourceMappingURL=join_split_prover.d.ts.map
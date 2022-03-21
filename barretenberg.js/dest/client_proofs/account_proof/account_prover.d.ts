/// <reference types="node" />
import { SchnorrSignature } from '../../crypto';
import { UnrolledProver } from '../prover';
import { AccountTx } from './account_tx';
export declare class AccountProver {
    private prover;
    readonly mock: boolean;
    constructor(prover: UnrolledProver, mock?: boolean);
    static circuitSize: number;
    computeKey(): Promise<void>;
    loadKey(keyBuf: Buffer): Promise<void>;
    getKey(): Promise<Buffer>;
    computeSigningData(tx: AccountTx): Promise<Buffer>;
    createAccountProof(tx: AccountTx, signature: SchnorrSignature): Promise<Buffer>;
    getProver(): UnrolledProver;
}
//# sourceMappingURL=account_prover.d.ts.map
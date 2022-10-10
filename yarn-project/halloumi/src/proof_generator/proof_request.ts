import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { ClaimProof } from './claim_proof.js';
import { RootRollup } from './root_rollup.js';
import { TxRollup } from './tx_rollup.js';
import { RootVerifier } from './root_verifier.js';

export enum ProofId {
  TX_ROLLUP,
  ROOT_ROLLUP,
  CLAIM,
  ROOT_VERIFIER,
}

export class TxRollupProofRequest {
  proofId = ProofId.TX_ROLLUP;

  constructor(public txRollup: TxRollup) {}

  toBuffer() {
    return Buffer.concat([numToUInt32BE(this.proofId), this.txRollup.toBuffer()]);
  }

  static fromBuffer(buf: Buffer) {
    const txRollup = TxRollup.fromBuffer(buf.slice(4));
    return new TxRollupProofRequest(txRollup);
  }
}

export class RootRollupProofRequest {
  proofId = ProofId.ROOT_ROLLUP;

  constructor(public rootRollup: RootRollup) {}

  toBuffer() {
    return Buffer.concat([numToUInt32BE(this.proofId), this.rootRollup.toBuffer()]);
  }
}

export class ClaimProofRequest {
  proofId = ProofId.CLAIM;

  constructor(public claimProof: ClaimProof) {}

  toBuffer() {
    return Buffer.concat([numToUInt32BE(this.proofId), this.claimProof.toBuffer()]);
  }
}

export class RootVerifierProofRequest {
  proofId = ProofId.ROOT_VERIFIER;

  constructor(public rootVerifier: RootVerifier) {}

  toBuffer() {
    return Buffer.concat([numToUInt32BE(this.proofId), this.rootVerifier.toBuffer()]);
  }
}

import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { ClaimProof } from './claim_proof';
import { RootRollup } from './root_rollup';
import { TxRollup } from './tx_rollup';
import { RootVerifier } from './root_verifier';

export enum ProofId {
  TX_ROLLUP,
  ROOT_ROLLUP,
  CLAIM,
  ROOT_VERIFIER,
}

export class TxRollupProofRequest {
  proofId = ProofId.TX_ROLLUP;

  constructor(public rollupSize: number, public txRollup: TxRollup) {}

  toBuffer() {
    return Buffer.concat([numToUInt32BE(this.proofId), numToUInt32BE(this.rollupSize), this.txRollup.toBuffer()]);
  }

  static fromBuffer(buf: Buffer) {
    let start = 4;
    const rollupSize = buf.readUInt32BE(start);
    start += 4;
    const txRollup = TxRollup.fromBuffer(buf.slice(start));
    return new TxRollupProofRequest(rollupSize, txRollup);
  }
}

export class RootRollupProofRequest {
  proofId = ProofId.ROOT_ROLLUP;

  constructor(public txRollupSize: number, public rootRollupSize: number, public rootRollup: RootRollup) {}

  toBuffer() {
    return Buffer.concat([
      numToUInt32BE(this.proofId),
      numToUInt32BE(this.txRollupSize),
      numToUInt32BE(this.rootRollupSize),
      this.rootRollup.toBuffer(),
    ]);
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

  constructor(public txRollupSize: number, public rootRollupSize: number, public rootVerifier: RootVerifier) {}

  toBuffer() {
    return Buffer.concat([
      numToUInt32BE(this.proofId),
      numToUInt32BE(this.txRollupSize),
      numToUInt32BE(this.rootRollupSize),
      this.rootVerifier.toBuffer(),
    ]);
  }
}

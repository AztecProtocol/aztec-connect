import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { RootRollup } from './root_rollup';
import { TxRollup } from './tx_rollup';

export enum ProofId {
  TX_ROLLUP,
  ROOT_ROLLUP,
}

export class TxRollupProofRequest {
  proofId = ProofId.TX_ROLLUP;

  constructor(public rollupSize: number, public txRollup: TxRollup) {}

  toBuffer() {
    return Buffer.concat([numToUInt32BE(this.proofId), numToUInt32BE(this.rollupSize), this.txRollup.toBuffer()]);
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

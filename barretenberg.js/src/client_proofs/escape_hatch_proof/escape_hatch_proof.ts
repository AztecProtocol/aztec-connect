import { InnerProofData, RollupProofData } from '../../rollup_proof/index';

export class EscapeHatchProof extends RollupProofData {
  constructor(
    rollupId: number,
    rollupSize: number,
    dataStartIndex: number,
    oldDataRoot: Buffer,
    newDataRoot: Buffer,
    oldNullRoot: Buffer,
    newNullRoot: Buffer,
    oldDataRootsRoot: Buffer,
    newDataRootsRoot: Buffer,
    numTxs: number,
    innerProofData: InnerProofData[],
  ) {
    super(
      rollupId,
      rollupSize,
      dataStartIndex,
      oldDataRoot,
      newDataRoot,
      oldNullRoot,
      newNullRoot,
      oldDataRootsRoot,
      newDataRootsRoot,
      numTxs,
      innerProofData,
    );
  }
}

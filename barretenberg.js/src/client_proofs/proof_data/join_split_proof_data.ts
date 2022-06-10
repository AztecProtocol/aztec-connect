import { EthAddress } from '../../address';
import { toBigIntBE } from '../../bigint_buffer';
import { ProofData } from './proof_data';

export class JoinSplitProofData {
  constructor(public readonly proofData: ProofData) {}

  static fromBuffer(rawProofData: Buffer) {
    return new JoinSplitProofData(new ProofData(rawProofData));
  }

  get txId() {
    return this.proofData.txId;
  }

  get publicAssetId() {
    return this.proofData.publicAssetId.readUInt32BE(28);
  }

  get publicValue() {
    return toBigIntBE(this.proofData.publicValue);
  }

  get publicOwner() {
    return new EthAddress(this.proofData.publicOwner);
  }

  get txFee() {
    return toBigIntBE(this.proofData.txFee);
  }

  get txFeeAssetId() {
    return this.proofData.feeAssetId;
  }
}

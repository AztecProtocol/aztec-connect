import { EthAddress } from '../../address';
import { AssetId } from '../../asset';
import { toBigIntBE } from '../../bigint_buffer';
import { ClientProofData } from './client_proof_data';

export class JoinSplitClientProofData {
  constructor(public readonly proofData: ClientProofData) {}

  static fromBuffer(rawProofData: Buffer) {
    return new JoinSplitClientProofData(new ClientProofData(rawProofData));
  }

  get txId() {
    return this.proofData.txId;
  }

  get assetId(): AssetId {
    return this.proofData.assetId.readUInt32BE(28);
  }

  get publicInput() {
    return toBigIntBE(this.proofData.publicInput);
  }

  get publicOutput() {
    return toBigIntBE(this.proofData.publicOutput);
  }

  get inputOwner() {
    return new EthAddress(this.proofData.inputOwner);
  }

  get outputOwner() {
    return new EthAddress(this.proofData.outputOwner);
  }

  get txFee() {
    return toBigIntBE(this.proofData.txFee);
  }

  get txFeeAssetId(): AssetId {
    return this.proofData.txFeeAssetId.readUInt32BE(28);
  }
}

import { EthAddress } from '../../address';
import { AssetId } from '../../asset';
import { toBigIntBE } from '../../bigint_buffer';
import { ProofData } from './proof_data';

export class JoinSplitProofData {
  public assetId: AssetId;
  public publicInput: bigint;
  public publicOutput: bigint;
  public inputOwner: EthAddress;
  public outputOwner: EthAddress;

  constructor(public proofData: ProofData) {
    this.assetId = this.proofData.assetId.readUInt32BE(28);
    this.publicInput = toBigIntBE(this.proofData.publicInput);
    this.publicOutput = toBigIntBE(this.proofData.publicOutput);

    this.inputOwner = new EthAddress(this.proofData.inputOwner.slice(12));
    this.outputOwner = new EthAddress(this.proofData.outputOwner.slice(12));
  }

  get txId() {
    return this.proofData.txId;
  }
}

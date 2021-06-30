import { EthAddress } from '../../address';
import { AssetId } from '../../asset';
import { toBigIntBE } from '../../bigint_buffer';
import { LENGTH_PROOF_HEADER_INPUTS } from './create_tx_id';
import { ProofData } from './proof_data';

export class JoinSplitProofData {
  public assetId: AssetId;
  public publicInput: bigint;
  public publicOutput: bigint;
  public inputOwner: EthAddress;
  public outputOwner: EthAddress;
  public depositSigningData: Buffer;

  constructor(public proofData: ProofData) {
    this.assetId = this.proofData.assetId.readUInt32BE(28);
    this.publicInput = toBigIntBE(this.proofData.publicInput);
    this.publicOutput = toBigIntBE(this.proofData.publicOutput);

    this.inputOwner = new EthAddress(this.proofData.inputOwner.slice(12));
    this.outputOwner = new EthAddress(this.proofData.outputOwner.slice(12));

    /**
     * TODO: Get rid of this in favor of just signing tx id.
     * The data we sign over for authorizing deposits, consists of the data that is published on chain.
     * This excludes the last two fields, the noteTreeRoot and the txFee.
     */
    this.depositSigningData = this.proofData.rawProofData.slice(0, LENGTH_PROOF_HEADER_INPUTS);
  }
}

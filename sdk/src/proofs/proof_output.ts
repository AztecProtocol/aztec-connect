import { EthAddress } from 'barretenberg/address';
import { EthereumSigner } from 'barretenberg/blockchain';
import { Proof } from 'barretenberg/rollup_provider';
import { ViewingKey } from 'barretenberg/viewing_key';
import { utils } from 'ethers';
import { UserAccountTx, UserJoinSplitTx } from '../user_tx';

export interface ProofOutput extends Proof {
  tx: UserJoinSplitTx | UserAccountTx;
  signingData?: Buffer;
}

export class JoinSplitProofOutput implements ProofOutput {
  private signature?: Buffer;

  constructor(
    public tx: UserJoinSplitTx,
    public proofData: Buffer,
    public viewingKeys: ViewingKey[],
    public signingData?: Buffer,
  ) {}

  get depositSignature() {
    return this.signature;
  }

  public async ethSign(ethSigner: EthereumSigner, inputOwner: EthAddress) {
    if (!this.signingData) {
      throw new Error('This proof does not require a signature.');
    }

    const msgHash = utils.keccak256(this.signingData);
    const digest = utils.arrayify(msgHash);
    this.signature = await ethSigner.signMessage(Buffer.from(digest), inputOwner);
  }
}

export class AccountProofOutput implements ProofOutput {
  public readonly viewingKeys = [];

  constructor(public tx: UserAccountTx, public proofData: Buffer) {}
}

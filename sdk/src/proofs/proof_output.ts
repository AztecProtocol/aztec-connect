import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { EthereumSigner } from 'barretenberg/blockchain';
import { AccountProofData, ProofData } from 'barretenberg/client_proofs/proof_data';
import { Proof } from 'barretenberg/rollup_provider';
import { TxHash } from 'barretenberg/tx_hash';
import { ViewingKey } from 'barretenberg/viewing_key';
import { utils } from 'ethers';
import { AccountId } from '../user';
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

  static fromBuffer(buf: Buffer) {
    const [migratedBuf, rawProofData] = [buf.slice(0, 1), buf.slice(1)];
    const proofData = new ProofData(rawProofData);
    const accountProof = new AccountProofData(proofData);
    const publicKey = new GrumpkinAddress(accountProof.publicKey);
    const { nonce, aliasHash } = accountProof.accountAliasId;
    const tx = {
      txHash: new TxHash(proofData.txId),
      userId: new AccountId(publicKey, nonce),
      aliasHash,
      newSigningPubKey1: proofData.inputOwner,
      newSigningPubKey2: proofData.outputOwner,
      migrated: !migratedBuf.equals(Buffer.alloc(1)),
      created: new Date(),
    };
    return new AccountProofOutput(tx, rawProofData);
  }

  toBuffer() {
    return Buffer.concat([Buffer.from([+this.tx.migrated]), this.proofData]);
  }
}

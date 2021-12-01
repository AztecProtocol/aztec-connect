import { GrumpkinAddress } from 'barretenberg/address';
import { AccountProofData, ProofData } from 'barretenberg/client_proofs/proof_data';
import { Proof } from 'barretenberg/rollup_provider';
import { TxHash } from 'barretenberg/tx_hash';
import { ViewingKey } from 'barretenberg/viewing_key';
import { AccountId } from '../user';
import { UserAccountTx, UserJoinSplitTx } from '../user_tx';

export interface ProofOutput extends Proof {
  tx: UserJoinSplitTx | UserAccountTx;
  signingData?: Buffer;
  parentProof?: ProofOutput;
}

export class JoinSplitProofOutput implements ProofOutput {
  constructor(
    public tx: UserJoinSplitTx,
    public proofData: Buffer,
    public viewingKeys: ViewingKey[],
    public signingData?: Buffer,
    public parentProof?: ProofOutput,
  ) {}
}

export class AccountProofOutput implements ProofOutput {
  public readonly viewingKeys = [];

  constructor(public tx: UserAccountTx, public proofData: Buffer, public parentProof?: ProofOutput) {}

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

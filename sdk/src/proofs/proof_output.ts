import { ProofData } from '@aztec/barretenberg/client_proofs';
import { TreeNote } from '@aztec/barretenberg/note_algorithms';
import {
  OffchainAccountData,
  OffchainDefiDepositData,
  OffchainJoinSplitData,
} from '@aztec/barretenberg/offchain_tx_data';
import { Proof } from '@aztec/barretenberg/rollup_provider';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { AccountId } from '../user';
import { UserAccountTx, UserDefiTx, UserJoinSplitTx } from '../user_tx';

export interface ProofOutput extends Proof {
  tx: UserJoinSplitTx | UserAccountTx | UserDefiTx;
  outputNotes: TreeNote[];
  parentProof?: ProofOutput;
}

export class JoinSplitProofOutput implements ProofOutput {
  public readonly offchainTxData: Buffer;

  constructor(
    public readonly tx: UserJoinSplitTx,
    public readonly outputNotes: TreeNote[],
    public readonly proofData: Buffer,
    offchainTxData: OffchainJoinSplitData,
  ) {
    this.offchainTxData = offchainTxData.toBuffer();
  }
}

export class AccountProofOutput implements ProofOutput {
  public readonly offchainTxData: Buffer;
  public readonly outputNotes = [];

  constructor(
    public readonly tx: UserAccountTx,
    public readonly proofData: Buffer,
    offchainTxData: OffchainAccountData,
  ) {
    this.offchainTxData = offchainTxData.toBuffer();
  }

  static fromBuffer(buf: Buffer) {
    let dataStart = 0;
    const migratedBuf = buf.slice(dataStart, dataStart + 1);
    dataStart += 1;
    const rawProofDataLen = buf.slice(dataStart, dataStart + 4).readUInt32BE(0);
    dataStart += 4;
    const rawProofData = buf.slice(dataStart, dataStart + rawProofDataLen);
    dataStart += rawProofDataLen;
    const rawOffchainAccountData = buf.slice(dataStart);

    const proofData = new ProofData(rawProofData);
    const offchainTxData = OffchainAccountData.fromBuffer(rawOffchainAccountData);
    const { accountPublicKey, accountAliasId, spendingPublicKey1, spendingPublicKey2 } = offchainTxData;
    const tx = new UserAccountTx(
      new TxHash(proofData.txId),
      new AccountId(accountPublicKey, accountAliasId.nonce),
      accountAliasId.aliasHash,
      spendingPublicKey1,
      spendingPublicKey2,
      !migratedBuf.equals(Buffer.alloc(1)),
      new Date(),
    );

    return new AccountProofOutput(tx, rawProofData, offchainTxData);
  }

  toBuffer() {
    return Buffer.concat([
      Buffer.from([+this.tx.migrated]),
      numToUInt32BE(this.proofData.length),
      this.proofData,
      this.offchainTxData,
    ]);
  }
}

export class DefiProofOutput implements ProofOutput {
  public readonly offchainTxData: Buffer;

  constructor(
    public readonly tx: UserDefiTx,
    public readonly outputNotes: TreeNote[],
    public readonly proofData: Buffer,
    offchainTxData: OffchainDefiDepositData,
    public readonly parentProof?: JoinSplitProofOutput,
  ) {
    this.offchainTxData = offchainTxData.toBuffer();
  }
}

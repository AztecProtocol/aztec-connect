import { EthAddress } from '../address';
import { AssetId } from '../asset';
import { toBigIntBE } from '../bigint_buffer';
import { ProofId } from '../client_proofs';
import { InnerProofData } from './inner_proof';
import { TxEncoding } from './tx_encoding';

export class JoinSplitProofData {
  static ENCODED_LENGTH = (encoding: TxEncoding) => {
    if (encoding === TxEncoding.SEND) {
      return 1 + 5 * 32;
    }
    return 1 + 6 * 32 + 20;
  };

  public assetId: AssetId;
  public publicInput: bigint;
  public publicOutput: bigint;
  public inputOwner: EthAddress;
  public outputOwner: EthAddress;

  constructor(public proofData: InnerProofData) {
    if (proofData.proofId !== ProofId.JOIN_SPLIT) {
      throw new Error('Not a join split proof.');
    }

    this.assetId = this.proofData.assetId.readUInt32BE(28);
    this.publicInput = toBigIntBE(this.proofData.publicInput);
    this.publicOutput = toBigIntBE(this.proofData.publicOutput);
    this.inputOwner = new EthAddress(this.proofData.inputOwner.slice(12));
    this.outputOwner = new EthAddress(this.proofData.outputOwner.slice(12));
  }

  static decode(encoded: Buffer) {
    const encoding = encoded.readUInt8(0);
    if (![TxEncoding.DEPOSIT, TxEncoding.WITHDRAW, TxEncoding.SEND].includes(encoding)) {
      throw new Error('Not a join split proof.');
    }

    let offset = 1;
    if (encoding === TxEncoding.SEND) {
      const assetId = encoded.slice(offset, offset + 32);
      offset += 32;
      const noteCommitment1 = encoded.slice(offset, offset + 32);
      offset += 32;
      const noteCommitment2 = encoded.slice(offset, offset + 32);
      offset += 32;
      const nullifier1 = encoded.slice(offset, offset + 32);
      offset += 32;
      const nullifier2 = encoded.slice(offset, offset + 32);
      return new JoinSplitProofData(
        new InnerProofData(
          ProofId.JOIN_SPLIT,
          Buffer.alloc(32),
          Buffer.alloc(32),
          assetId,
          noteCommitment1,
          noteCommitment2,
          nullifier1,
          nullifier2,
          Buffer.alloc(32),
          Buffer.alloc(32),
        ),
      );
    } else {
      const isDeposit = encoding === TxEncoding.DEPOSIT;
      const publicValue = encoded.slice(offset, offset + 32);
      offset += 32;
      const assetId = encoded.slice(offset, offset + 32);
      offset += 32;
      const noteCommitment1 = encoded.slice(offset, offset + 32);
      offset += 32;
      const noteCommitment2 = encoded.slice(offset, offset + 32);
      offset += 32;
      const nullifier1 = encoded.slice(offset, offset + 32);
      offset += 32;
      const nullifier2 = encoded.slice(offset, offset + 32);
      offset += 32;
      const publicOwner = encoded.slice(offset, offset + 20);
      return new JoinSplitProofData(
        new InnerProofData(
          ProofId.JOIN_SPLIT,
          isDeposit ? publicValue : Buffer.alloc(32),
          isDeposit ? Buffer.alloc(32) : publicValue,
          assetId,
          noteCommitment1,
          noteCommitment2,
          nullifier1,
          nullifier2,
          isDeposit ? Buffer.concat([Buffer.alloc(12), publicOwner]) : Buffer.alloc(32),
          isDeposit ? Buffer.alloc(32) : Buffer.concat([Buffer.alloc(12), publicOwner]),
        ),
      );
    }
  }

  encode() {
    const { assetId, noteCommitment1, noteCommitment2, nullifier1, nullifier2 } = this.proofData;
    if (!this.publicInput && !this.publicOutput) {
      return Buffer.concat([
        Buffer.from([TxEncoding.SEND]),
        assetId,
        noteCommitment1,
        noteCommitment2,
        nullifier1,
        nullifier2,
      ]);
    }

    const { publicInput, publicOutput } = this.proofData;
    return Buffer.concat([
      Buffer.from([this.publicInput ? TxEncoding.DEPOSIT : TxEncoding.WITHDRAW]),
      this.publicInput ? publicInput : publicOutput,
      assetId,
      noteCommitment1,
      noteCommitment2,
      nullifier1,
      nullifier2,
      (this.publicInput ? this.inputOwner : this.outputOwner).toBuffer(),
    ]);
  }
}

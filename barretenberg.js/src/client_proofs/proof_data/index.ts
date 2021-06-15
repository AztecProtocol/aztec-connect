import { toBigIntBE } from 'bigint-buffer';
import { createHash } from 'crypto';
import { EthAddress } from '../../address';
import { AssetId } from '../../asset';
import { AccountAliasId } from '../account_alias_id';

export enum ProofId {
  JOIN_SPLIT,
  ACCOUNT,
  DEFI_DEPOSIT,
  DEFI_CLAIM,
}

/**
 * Represents tx proof data as returned by the proof generator.
 * Differs to on chain data, in that not data here is actually published.
 * Fields that differ between proofs, or natural buffers, are of type Buffer.
 * Fields that are always of fixed type/meaning are converted.
 */
export class ProofData {
  static readonly NUM_PUBLIC_INPUTS = 14;
  static readonly NUM_PUBLISHED_PUBLIC_INPUTS = 12;

  public readonly txId: Buffer;
  public readonly proofId: ProofId;
  public readonly publicInput: Buffer;
  public readonly publicOutput: Buffer;
  public readonly assetId: Buffer;
  public readonly newNote1: Buffer;
  public readonly newNote2: Buffer;
  public readonly nullifier1: Buffer;
  public readonly nullifier2: Buffer;
  public readonly inputOwner: Buffer;
  public readonly outputOwner: Buffer;
  public readonly noteTreeRoot: Buffer;
  public readonly txFee: bigint;

  constructor(public rawProofData: Buffer) {
    this.proofId = rawProofData.readUInt32BE(0 * 32 + 28);
    this.publicInput = rawProofData.slice(1 * 32, 1 * 32 + 32);
    this.publicOutput = rawProofData.slice(2 * 32, 2 * 32 + 32);
    this.assetId = rawProofData.slice(3 * 32, 3 * 32 + 32);
    this.newNote1 = rawProofData.slice(4 * 32, 4 * 32 + 64);
    this.newNote2 = rawProofData.slice(6 * 32, 6 * 32 + 64);
    this.nullifier1 = rawProofData.slice(8 * 32, 8 * 32 + 32);
    this.nullifier2 = rawProofData.slice(9 * 32, 9 * 32 + 32);
    this.inputOwner = rawProofData.slice(10 * 32, 10 * 32 + 32);
    this.outputOwner = rawProofData.slice(11 * 32, 11 * 32 + 32);

    // Not published as part of inner proofs.
    this.noteTreeRoot = rawProofData.slice(12 * 32, 12 * 32 + 32);
    this.txFee = toBigIntBE(rawProofData.slice(13 * 32, 13 * 32 + 32));

    this.txId = createHash('sha256')
      .update(this.rawProofData.slice(0, ProofData.NUM_PUBLISHED_PUBLIC_INPUTS * 32))
      .digest();
  }
}

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
    this.depositSigningData = this.proofData.rawProofData.slice(0, ProofData.NUM_PUBLISHED_PUBLIC_INPUTS * 32);
  }
}

export class AccountProofData {
  public accountAliasId: AccountAliasId;
  public publicKey: Buffer;

  constructor(public proofData: ProofData) {
    this.accountAliasId = AccountAliasId.fromBuffer(proofData.assetId);
    this.publicKey = Buffer.concat([proofData.publicInput, proofData.publicOutput]);
  }
}

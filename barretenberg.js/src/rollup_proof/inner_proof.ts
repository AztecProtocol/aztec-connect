import { toBigIntBE } from '../bigint_buffer';
import { createHash } from 'crypto';
import { EthAddress } from '../address';
import { AssetId } from '../asset';
import { BridgeId } from '../bridge_id';
import { AccountAliasId } from '../account_id';
import { numToUInt32BE } from '../serialize';
import { ProofId } from '../client_proofs';

export class InnerProofData {
  static NUM_PUBLIC_INPUTS = 12;
  static LENGTH = InnerProofData.NUM_PUBLIC_INPUTS * 32;

  public txId: Buffer;

  constructor(
    public proofId: ProofId,
    public publicInput: Buffer,
    public publicOutput: Buffer,
    public assetId: Buffer,
    public newNote1: Buffer,
    public newNote2: Buffer,
    public nullifier1: Buffer,
    public nullifier2: Buffer,
    public inputOwner: Buffer,
    public outputOwner: Buffer,
  ) {
    this.txId = createHash('sha256').update(this.toBuffer()).digest();
  }

  getDepositSigningData() {
    return this.toBuffer();
  }

  toBuffer() {
    return Buffer.concat([
      numToUInt32BE(this.proofId, 32),
      this.publicInput,
      this.publicOutput,
      this.assetId,
      this.newNote1,
      this.newNote2,
      this.nullifier1,
      this.nullifier2,
      this.inputOwner,
      this.outputOwner,
    ]);
  }

  isPadding() {
    return this.nullifier1.equals(Buffer.alloc(32, 0));
  }

  static fromBuffer(innerPublicInputs: Buffer) {
    const proofId = innerPublicInputs.readUInt32BE(0 * 32 + 28);
    const publicInput = innerPublicInputs.slice(1 * 32, 1 * 32 + 32);
    const publicOutput = innerPublicInputs.slice(2 * 32, 2 * 32 + 32);
    const assetId = innerPublicInputs.slice(3 * 32, 3 * 32 + 32);
    const newNote1 = innerPublicInputs.slice(4 * 32, 4 * 32 + 64);
    const newNote2 = innerPublicInputs.slice(6 * 32, 6 * 32 + 64);
    const nullifier1 = innerPublicInputs.slice(8 * 32, 8 * 32 + 32);
    const nullifier2 = innerPublicInputs.slice(9 * 32, 9 * 32 + 32);
    const inputOwner = innerPublicInputs.slice(10 * 32, 10 * 32 + 32);
    const outputOwner = innerPublicInputs.slice(11 * 32, 11 * 32 + 32);

    return new InnerProofData(
      proofId,
      publicInput,
      publicOutput,
      assetId,
      newNote1,
      newNote2,
      nullifier1,
      nullifier2,
      inputOwner,
      outputOwner,
    );
  }
}

export class JoinSplitProofData {
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
}

export class AccountProofData {
  public accountAliasId: AccountAliasId;
  public publicKey: Buffer;

  constructor(public proofData: InnerProofData) {
    if (proofData.proofId !== ProofId.ACCOUNT) {
      throw new Error('Not an account proof.');
    }

    this.accountAliasId = AccountAliasId.fromBuffer(proofData.assetId);
    this.publicKey = Buffer.concat([proofData.publicInput, proofData.publicOutput]);
  }
}

export class DefiDepositProofData {
  public bridgeId: BridgeId;
  public depositValue: bigint;
  public partialState: Buffer;

  constructor(public proofData: InnerProofData) {
    if (proofData.proofId !== ProofId.DEFI_DEPOSIT) {
      throw new Error('Not a defi deposit proof.');
    }

    const { assetId, publicOutput, inputOwner, outputOwner } = proofData;
    this.bridgeId = BridgeId.fromBuffer(assetId);
    this.depositValue = toBigIntBE(publicOutput);
    this.partialState = Buffer.concat([inputOwner, outputOwner]);
  }
}

export class DefiClaimProofData {
  public bridgeId: BridgeId;

  constructor(public proofData: InnerProofData) {
    if (proofData.proofId !== ProofId.DEFI_CLAIM) {
      throw new Error('Not a defi claim proof.');
    }

    const { assetId } = proofData;
    this.bridgeId = BridgeId.fromBuffer(assetId);
  }
}

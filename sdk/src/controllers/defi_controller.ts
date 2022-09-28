import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { BridgeCallData, validateBridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { TxId } from '@aztec/barretenberg/tx_id';
import { CoreSdkInterface } from '../core_sdk';
import { Note } from '../note';
import { ProofOutput, proofOutputToProofTx } from '../proofs';
import { Signer } from '../signer';
import { createTxRefNo } from './create_tx_ref_no';

export class DefiController {
  private readonly requireFeePayingTx: boolean;
  private proofOutput?: ProofOutput;
  private jsProofOutputs: ProofOutput[] = [];
  private feeProofOutputs: ProofOutput[] = [];
  private txIds: TxId[] = [];

  constructor(
    public readonly userId: GrumpkinAddress,
    private readonly userSigner: Signer,
    public readonly bridgeCallData: BridgeCallData,
    public readonly assetValue: AssetValue,
    public readonly fee: AssetValue,
    private readonly core: CoreSdkInterface,
  ) {
    if (!assetValue.value) {
      throw new Error('Deposit value must be greater than 0.');
    }

    if (
      assetValue.assetId !== bridgeCallData.inputAssetIdA &&
      (bridgeCallData.inputAssetIdB === undefined || assetValue.assetId !== bridgeCallData.inputAssetIdB)
    ) {
      throw new Error(
        `Incorrect deposit asset. Expect ${bridgeCallData.inputAssetIdA}${
          bridgeCallData.inputAssetIdB !== undefined ? ` or ${bridgeCallData.inputAssetIdB}` : ''
        }. Got ${assetValue.assetId}.`,
      );
    }

    validateBridgeCallData(bridgeCallData);

    if (fee.value && fee.assetId === bridgeCallData.inputAssetIdB) {
      throw new Error('Fee paying asset must be the first input asset.');
    }

    this.requireFeePayingTx = !!fee.value && fee.assetId !== bridgeCallData.inputAssetIdA;
  }

  public async createProof() {
    const { value } = this.assetValue;
    const assetId = this.bridgeCallData.inputAssetIdA;
    const spendingPublicKey = this.userSigner.getPublicKey();
    const spendingKeyRequired = !spendingPublicKey.equals(this.userId);
    let notesA: Note[] = [];
    let notesB: Note[] = [];
    let requireJoinSplitTx = false;
    let joinSplitTargetAsset = assetId;

    const hasTwoAssets = this.bridgeCallData.numInputAssets === 2;
    if (hasTwoAssets) {
      const assetIdB = this.bridgeCallData.inputAssetIdB!;
      const note2 = await this.core.pickNote(this.userId, assetIdB, value, spendingKeyRequired);
      notesB = note2 ? [note2] : await this.core.pickNotes(this.userId, assetIdB, value, spendingKeyRequired);
      if (!notesB.length) {
        throw new Error(`Failed to find notes of asset ${assetIdB} that sum to ${value}.`);
      }

      const totalInputNoteValue = notesB.reduce((sum, note) => sum + note.value, BigInt(0));
      const changeValue = totalInputNoteValue - value;
      if (changeValue || notesB.length > 1) {
        requireJoinSplitTx = true;
        joinSplitTargetAsset = assetIdB;
      }
    }

    const privateInput = value + (!this.requireFeePayingTx ? this.fee.value : BigInt(0));
    {
      const excludePendingNotes = notesB.some(n => n.pending);
      const note1 = hasTwoAssets
        ? await this.core.pickNote(this.userId, assetId, privateInput, spendingKeyRequired, excludePendingNotes)
        : undefined;
      notesA = note1
        ? [note1]
        : await this.core.pickNotes(this.userId, assetId, privateInput, spendingKeyRequired, excludePendingNotes);
      if (!notesA.length) {
        throw new Error(`Failed to find notes of asset ${assetId} that sum to ${privateInput}.`);
      }

      const totalInputNoteValue = notesA.reduce((sum, note) => sum + note.value, BigInt(0));
      const changeValue = totalInputNoteValue - privateInput;
      if (changeValue || notesA.length > 2 || (hasTwoAssets && notesA.length > 1)) {
        if (requireJoinSplitTx) {
          throw new Error(`Cannot find a note with the exact value for asset ${assetId}. Require ${privateInput}.`);
        }

        requireJoinSplitTx = true;
      }
    }

    const txRefNo = this.requireFeePayingTx || requireJoinSplitTx ? createTxRefNo() : 0;

    if (this.requireFeePayingTx) {
      const feeProofInputs = await this.core.createPaymentProofInputs(
        this.userId,
        this.fee.assetId,
        BigInt(0),
        BigInt(0),
        this.fee.value,
        BigInt(0),
        BigInt(0),
        this.userId,
        spendingKeyRequired,
        undefined,
        spendingPublicKey,
        2,
      );
      this.feeProofOutputs = [];
      for (const proofInput of feeProofInputs) {
        proofInput.signature = await this.userSigner.signMessage(proofInput.signingData);
        this.feeProofOutputs.push(await this.core.createPaymentProof(proofInput, txRefNo));
      }
    }

    // Create a defi deposit tx with 0 change value.
    if (!requireJoinSplitTx) {
      const notes = [...notesA, ...notesB];
      const proofInput = await this.core.createDefiProofInput(
        this.userId,
        this.bridgeCallData,
        value,
        notes,
        spendingPublicKey,
      );
      proofInput.signature = await this.userSigner.signMessage(proofInput.signingData);
      this.proofOutput = await this.core.createDefiProof(proofInput, txRefNo);
    } else {
      // Create join split txs to generate an output note with the exact value for the defi deposit plus fee.
      // When depositing two different input assets, this chained txs should pay for the fee if it's fee-paying asset.
      {
        const noteValue = joinSplitTargetAsset === assetId ? privateInput : value;
        const jsProofInputs = await this.core.createPaymentProofInputs(
          this.userId,
          joinSplitTargetAsset,
          BigInt(0),
          BigInt(0),
          noteValue, // privateInput
          noteValue, // recipientPrivateOutput
          BigInt(0),
          this.userId,
          spendingKeyRequired,
          undefined,
          spendingPublicKey,
          3, // allowChain
        );
        this.jsProofOutputs = [];
        for (const proofInput of jsProofInputs) {
          proofInput.signature = await this.userSigner.signMessage(proofInput.signingData);
          this.jsProofOutputs.push(await this.core.createPaymentProof(proofInput, txRefNo));
        }
      }

      // Use the first output note from the last tx in the above chained txs as the input note.
      {
        const inputNotes = [this.jsProofOutputs[this.jsProofOutputs.length - 1].outputNotes[0]];
        if (hasTwoAssets) {
          if (joinSplitTargetAsset === assetId) {
            inputNotes.push(notesB[0]);
          } else {
            inputNotes.unshift(notesA[0]);
          }
        }
        const proofInput = await this.core.createDefiProofInput(
          this.userId,
          this.bridgeCallData,
          value,
          inputNotes,
          spendingPublicKey,
        );
        proofInput.signature = await this.userSigner.signMessage(proofInput.signingData);
        this.proofOutput = await this.core.createDefiProof(proofInput, txRefNo);
      }
    }
  }

  public exportProofTxs() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() first.');
    }

    return [...this.jsProofOutputs, this.proofOutput, ...this.feeProofOutputs].map(proofOutputToProofTx);
  }

  public async send() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() first.');
    }
    this.txIds = await this.core.sendProofs([...this.jsProofOutputs, this.proofOutput, ...this.feeProofOutputs]);
    return this.getDefiTxId();
  }

  public async awaitDefiDepositCompletion(timeout?: number) {
    if (!this.txIds.length) {
      throw new Error(`Call ${!this.proofOutput ? 'createProof()' : 'send()'} first.`);
    }
    await Promise.all(this.txIds.map(txId => this.core.awaitSettlement(txId, timeout)));
  }

  public async awaitDefiFinalisation(timeout?: number) {
    const txId = this.getDefiTxId();
    if (!txId) {
      throw new Error(`Call ${!this.proofOutput ? 'createProof()' : 'send()'} first.`);
    }
    await this.core.awaitDefiFinalisation(txId, timeout);
  }

  public async awaitSettlement(timeout?: number) {
    const txId = this.getDefiTxId();
    if (!txId) {
      throw new Error(`Call ${!this.proofOutput ? 'createProof()' : 'send()'} first.`);
    }
    await this.core.awaitDefiSettlement(txId, timeout);
  }

  public getInteractionNonce() {
    const txId = this.getDefiTxId();
    if (!txId) {
      throw new Error(`Call ${!this.proofOutput ? 'createProof()' : 'send()'} first.`);
    }
    return this.core.getDefiInteractionNonce(txId);
  }

  private getDefiTxId() {
    return this.txIds[this.jsProofOutputs.length];
  }
}

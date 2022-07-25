import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { BridgeCallData, validateBridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { TxId } from '@aztec/barretenberg/tx_id';
import { CoreSdkInterface } from '../core_sdk';
import { ProofOutput } from '../proofs';
import { Signer } from '../signer';
import { createTxRefNo } from './create_tx_ref_no';
import { filterUndefined } from './filter_undefined';

export class DefiController {
  private proofOutput?: ProofOutput;
  private jsProofOutput?: ProofOutput;
  private feeProofOutput?: ProofOutput;
  private txIds: TxId[] = [];

  constructor(
    public readonly userId: GrumpkinAddress,
    private readonly userSigner: Signer,
    public readonly bridgeCallData: BridgeCallData,
    public readonly depositValue: AssetValue,
    public readonly fee: AssetValue,
    private readonly core: CoreSdkInterface,
  ) {
    if (!depositValue.value) {
      throw new Error('Deposit value must be greater than 0.');
    }

    if (depositValue.assetId !== bridgeCallData.inputAssetIdA) {
      throw new Error(`Incorrect deposit asset. Expect ${bridgeCallData.inputAssetIdA}. Got ${depositValue.assetId}.`);
    }

    validateBridgeCallData(bridgeCallData);

    if (bridgeCallData.inputAssetIdB === fee.assetId) {
      throw new Error('Fee paying asset must be the first input asset.');
    }
  }

  public async createProof() {
    const spendingPublicKey = this.userSigner.getPublicKey();
    const spendingKeyRequired = !spendingPublicKey.equals(this.userId);
    const { assetId, value } = this.depositValue;
    const hasTwoAssets = this.bridgeCallData.numInputAssets === 2;
    const requireFeePayingTx = !!this.fee.value && this.fee.assetId !== assetId;
    const privateInput = value + (!requireFeePayingTx ? this.fee.value : BigInt(0));
    const note1 = hasTwoAssets
      ? await this.core.pickNote(this.userId, assetId, privateInput, spendingKeyRequired)
      : undefined;
    let notes = note1 ? [note1] : await this.core.pickNotes(this.userId, assetId, privateInput, spendingKeyRequired);
    if (!notes.length) {
      throw new Error(`Failed to find no more than 2 notes of asset ${assetId} that sum to ${privateInput}.`);
    }

    const totalInputNoteValue = notes.reduce((sum, note) => sum + note.value, BigInt(0));
    const changeValue = totalInputNoteValue - privateInput;
    let requireJoinSplitTx = !!changeValue || (hasTwoAssets && notes.length > 1);
    let joinSplitTargetNote = requireJoinSplitTx ? 1 : 0;
    if (hasTwoAssets) {
      const secondAssetId = this.bridgeCallData.inputAssetIdB!;
      const excludePendingNotes = requireJoinSplitTx || notes.some(n => n.pending);
      const note2 = await this.core.pickNote(
        this.userId,
        secondAssetId,
        value,
        spendingKeyRequired,
        excludePendingNotes,
      );
      const notes2 = note2
        ? [note2]
        : await this.core.pickNotes(this.userId, secondAssetId, value, spendingKeyRequired, excludePendingNotes);
      if (!notes2.length) {
        throw new Error(`Failed to find no more than 2 notes of asset ${secondAssetId} that sum to ${value}.`);
      }

      const totalInputNoteValue2 = notes2.reduce((sum, note) => sum + note.value, BigInt(0));
      const changeValue2 = totalInputNoteValue2 - value;
      if (changeValue2 || notes2.length > 1) {
        if (requireJoinSplitTx) {
          throw new Error(`Cannot find a note with the exact value for asset ${secondAssetId}. Require ${value}.`);
        }

        requireJoinSplitTx = true;
        joinSplitTargetNote = 2;
      }

      notes = [...notes, ...notes2];
    }

    const txRefNo = requireFeePayingTx || requireJoinSplitTx ? createTxRefNo() : 0;

    // Create a defi deposit tx with 0 change value.
    if (!requireJoinSplitTx) {
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
      // Create a join split tx to generate an output note with the exact value for the defi deposit plus fee.
      // When depositing two different input assets, this tx should pay for the fee if it's fee-paying asset.
      {
        const changeNoteAssetId = joinSplitTargetNote === 2 ? this.bridgeCallData.inputAssetIdB! : assetId;
        const noteValue = joinSplitTargetNote === 2 ? value : privateInput;
        const proofInput = await this.core.createPaymentProofInput(
          this.userId,
          changeNoteAssetId,
          BigInt(0),
          BigInt(0),
          noteValue, // private input
          noteValue,
          BigInt(0),
          this.userId,
          spendingKeyRequired,
          undefined,
          spendingPublicKey,
          3, // allowChain
        );
        proofInput.signature = await this.userSigner.signMessage(proofInput.signingData);
        this.jsProofOutput = await this.core.createPaymentProof(proofInput, txRefNo);
      }

      // Use the first output note from the above j/s tx as the input note.
      {
        const inputNotes = [this.jsProofOutput.outputNotes[0]];
        if (hasTwoAssets) {
          if (joinSplitTargetNote === 2) {
            inputNotes.unshift(notes[0]);
          } else {
            inputNotes.push(notes[notes.length - 1]);
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

    if (requireFeePayingTx) {
      const proofInput = await this.core.createPaymentProofInput(
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
      proofInput.signature = await this.userSigner.signMessage(proofInput.signingData);
      this.feeProofOutput = await this.core.createPaymentProof(proofInput, txRefNo);
    }
  }

  public async send() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() first.');
    }
    this.txIds = await this.core.sendProofs(
      filterUndefined([this.jsProofOutput, this.proofOutput, this.feeProofOutput]),
    );
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
    return this.txIds[this.jsProofOutput ? 1 : 0];
  }
}

import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { AuthAlgorithms } from '../../auth_algorithms/index.js';
import { Note } from '../../note/index.js';
import { DefiProofRequestData, SpendingKeyAccount } from '../proof_request_data/index.js';
import { JoinSplitTxInputCreator } from './join_split_tx_input_creator.js';
import { PaymentProofInputCreator } from './payment_proof_input_creator.js';
import { DefiProofInput, PaymentProofInput } from './proof_input.js';
import { ProofInputType } from './proof_input_type.js';

export class DefiProofInputCreator {
  constructor(
    private joinSplitTxInputCreator: JoinSplitTxInputCreator,
    private paymentProofInputCreator: PaymentProofInputCreator,
  ) {}

  public async createProofInputs(
    {
      accountPublicKey,
      bridgeCallData,
      assetValue,
      fee,
      inputNotes,
      spendingKeyAccount,
      dataRoot,
      allowChain,
    }: DefiProofRequestData,
    authAlgos: AuthAlgorithms,
  ) {
    const notesA = inputNotes.filter(n => n.assetId === bridgeCallData.inputAssetIdA);
    const notesB = inputNotes.filter(n => n.assetId === bridgeCallData.inputAssetIdB);
    const hasTwoAssets = bridgeCallData.numInputAssets === 2;
    const requireFeePayingTx = !!fee.value && fee.assetId !== bridgeCallData.inputAssetIdA;
    const feeNotes = requireFeePayingTx ? inputNotes.filter(n => n.assetId === fee.assetId) : [];

    const chainedProofInputs: PaymentProofInput[] = [];
    const defiInputNotes: Note[] = [];
    {
      // Here we need to generate the proof inputs based on the notes provided.
      // For asset A, we need the deposit value + any fee.
      // If there is only 1 input asset (asset A) AND we have more than 2 notes,
      // then remove 1 non-pending note from the pack (if there is one).
      // Also reduce the target value by the value of this note.
      let targetValue = assetValue.value + (!requireFeePayingTx ? fee.value : BigInt(0));
      const reservedNote = !hasTwoAssets && notesA.length > 2 ? notesA.find(n => !n.pending) : undefined;
      if (reservedNote) {
        defiInputNotes.push(reservedNote);
        targetValue -= reservedNote.value;
      }
      // We now need to produce J/S txs as required to give us the required number of notes for asset A.
      // If we have 2 input assets then we require a single note as output from these txs.
      // If we have reserved a note above then we require a single note as output from these txs.
      // Otherwise we can have 2 notes as output from these txs.
      // One thing to note is that we may have a perfect-sized note for asset A here.
      // In this case, this next operation should produce no J/S txs!
      // Another thing to note is that the check for non-pending notes when picking input notes is significant.
      // The output from the following operation will be a pending note and a tx can't have 2 pending input notes.
      const numberOfOutputNotes = hasTwoAssets || reservedNote ? 1 : 2;
      const { proofInputs, outputNotes } = await this.createChainedProofInputs(
        accountPublicKey,
        notesA.filter(n => n !== reservedNote),
        targetValue,
        numberOfOutputNotes,
        spendingKeyAccount,
        dataRoot,
        allowChain,
        authAlgos,
      );
      chainedProofInputs.push(...proofInputs);
      defiInputNotes.push(...outputNotes);
    }
    if (hasTwoAssets) {
      // Having produced the required note for asset A above (and any required J/S txs),
      // we now need to do the same for asset B.
      // As we have 2 assets then we must produce a single output note for this asset.
      const numberOfOutputNotes = 1;
      const { proofInputs, outputNotes } = await this.createChainedProofInputs(
        accountPublicKey,
        notesB,
        assetValue.value,
        numberOfOutputNotes,
        spendingKeyAccount,
        dataRoot,
        allowChain,
        authAlgos,
      );
      chainedProofInputs.push(...proofInputs);
      defiInputNotes.push(...outputNotes);
    }

    const defiProofInput = await this.createDefiProofInput(
      accountPublicKey,
      bridgeCallData,
      assetValue.value,
      defiInputNotes,
      spendingKeyAccount,
      dataRoot,
      authAlgos,
    );

    const feeProofInputs = feeNotes.length
      ? await this.paymentProofInputCreator.createFeeProofInputs(
          accountPublicKey,
          fee,
          feeNotes,
          spendingKeyAccount,
          dataRoot,
          allowChain,
          authAlgos,
        )
      : [];

    return [...chainedProofInputs, defiProofInput, ...feeProofInputs];
  }

  private async createChainedProofInputs(
    accountPublicKey: GrumpkinAddress,
    notes: Note[],
    targetValue: bigint,
    numberOfOutputNotes: number,
    spendingKeyAccount: SpendingKeyAccount,
    dataRoot: Buffer,
    allowChain: boolean,
    authAlgos: AuthAlgorithms,
  ) {
    const proofInputs: PaymentProofInput[] = [];
    const outputNotes: Note[] = [];

    if (notes.length > 2) {
      const chainedTxs = await this.joinSplitTxInputCreator.createChainedTxs(
        accountPublicKey,
        notes[0].assetId,
        notes,
        spendingKeyAccount,
        dataRoot,
        authAlgos,
      );
      notes = chainedTxs.outputNotes;
      proofInputs.push(...chainedTxs.proofInputs);
    }

    const noteSum = notes.reduce((sum, n) => sum + n.value, BigInt(0));
    if (noteSum === targetValue && notes.length <= numberOfOutputNotes) {
      outputNotes.push(...notes);
    } else {
      const accountSpendingKeyRequired = !spendingKeyAccount.spendingPublicKey.equals(accountPublicKey);
      const {
        tx,
        viewingKeys,
        signingData,
        outputNotes: [, changeNote],
      } = await this.joinSplitTxInputCreator.createTx(
        accountPublicKey,
        ProofId.SEND,
        notes[0].assetId,
        BigInt(0), // publicValue
        EthAddress.ZERO,
        noteSum - targetValue, // recipientPrivateOutput
        targetValue, // senderPrivateOutput
        BridgeCallData.ZERO,
        BigInt(0),
        accountPublicKey,
        accountSpendingKeyRequired,
        notes,
        spendingKeyAccount,
        dataRoot,
        allowChain ? 3 : 2,
        false, // hideNoteCreator
        authAlgos,
      );
      proofInputs.push({ type: ProofInputType.PaymentProofInput, tx, viewingKeys, signingData });
      outputNotes.push(changeNote);
    }

    return { proofInputs, outputNotes };
  }

  private async createDefiProofInput(
    accountPublicKey: GrumpkinAddress,
    bridgeCallData: BridgeCallData,
    depositValue: bigint,
    inputNotes: Note[],
    spendingKeyAccount: SpendingKeyAccount,
    dataRoot: Buffer,
    authAlgos: AuthAlgorithms,
  ): Promise<DefiProofInput> {
    const assetId = bridgeCallData.inputAssetIdA;
    const { tx, viewingKeys, partialStateSecretEphPubKey, signingData } = await this.joinSplitTxInputCreator.createTx(
      accountPublicKey,
      ProofId.DEFI_DEPOSIT,
      assetId,
      BigInt(0), // publicValue
      EthAddress.ZERO, // publicOwner
      BigInt(0), // recipientPrivateOutput
      BigInt(0), // senderPrivateOutput
      bridgeCallData,
      depositValue,
      accountPublicKey, // recipient
      false, // recipientSpendingKeyRequired
      inputNotes,
      spendingKeyAccount,
      dataRoot,
      0, // allowChain
      false, // hideNoteCreator
      authAlgos,
    );
    return {
      type: ProofInputType.DefiProofInput,
      tx,
      viewingKey: viewingKeys[0],
      partialStateSecretEphPubKey,
      signingData,
    };
  }
}

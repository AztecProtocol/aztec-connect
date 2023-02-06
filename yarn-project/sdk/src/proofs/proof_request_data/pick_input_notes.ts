import { AssetValue } from '@aztec/barretenberg/asset';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { WorldState } from '@aztec/barretenberg/world_state';
import { Note, restoreNotePath } from '../../note/index.js';
import { NotePickerOptions } from '../../note_picker/index.js';

export interface NotePicker {
  pickNotes(assetId: number, value: bigint, options?: NotePickerOptions): Promise<Note[]>;
  pickNote(assetId: number, value: bigint, options?: NotePickerOptions): Promise<Note | undefined>;
}

export const pickInputNotes = async (
  { assetId, value }: AssetValue,
  fee: AssetValue,
  options: NotePickerOptions,
  notePicker: NotePicker,
  worldState: WorldState,
) => {
  const requireFeePayingTx = !!fee.value && fee.assetId !== assetId;
  const privateInput = value + (!requireFeePayingTx ? fee.value : BigInt(0));
  const notes = privateInput ? await notePicker.pickNotes(assetId, privateInput, options) : [];
  if (privateInput && !notes.length) {
    throw new Error(`Failed to find notes for asset ${assetId} that sum to ${privateInput}.`);
  }
  const feeNotes = requireFeePayingTx ? await notePicker.pickNotes(fee.assetId, fee.value, options) : [];
  if (requireFeePayingTx && !feeNotes.length) {
    throw new Error(`Failed to find notes for asset ${fee.assetId} that sum to ${fee.value}.`);
  }
  return await Promise.all([...notes, ...feeNotes].map(note => restoreNotePath(note, worldState)));
};

export const pickDefiInputNotes = async (
  bridgeCallData: BridgeCallData,
  { value }: AssetValue,
  fee: AssetValue,
  options: NotePickerOptions,
  notePicker: NotePicker,
  worldState: WorldState,
) => {
  // The goal here is to create the necessary inputs for a defi tx.
  // A defi tx can have either 1 or 2 input assets..

  // If it has 1 input asset, then we can use both input notes to achieve the required deposit + fee value.
  // And we can create a chain of J/S txs to merge/split notes to achieve the required input.

  // If it has 2 input assets then we are more restricted.
  // We can only have 1 input note for each asset and we can only have 1 chain of J/S txs
  // to merge/splt notes in order to achieve the correct input for an asset.
  // So, for example:
  // We have 2 assets A and B.
  // We could create a chain of J/S txs to produce a single note for input asset B.
  // Then we MUST have a single note of the exact size for input asset A.
  // If we don't then we can't execute the tx.

  // An additional thing to note is the fee.
  // If it is not non-fee paying asset, it is paid for by input asset A.
  // So the input note(s) for asset A will need to include the requested fee value.
  const requireFeePayingTx = !!fee.value && fee.assetId !== bridgeCallData.inputAssetIdA;
  const feeNotes = requireFeePayingTx ? await notePicker.pickNotes(fee.assetId, fee.value, options) : [];

  let notesA: Note[] = [];
  let notesB: Note[] = [];
  let requireJoinSplitForAssetB = false;
  const hasTwoAssets = bridgeCallData.numInputAssets === 2;
  if (hasTwoAssets) {
    // We have 2 input assets, so it's the more complex situation as explained above.
    const assetIdB = bridgeCallData.inputAssetIdB!;
    // Look for a single note for asset B.
    const note2 = await notePicker.pickNote(assetIdB, value, options);
    // If we found a single note, great. If not then look for multiple notes.
    notesB = note2 ? [note2] : await notePicker.pickNotes(assetIdB, value, options);
    if (!notesB.length) {
      throw new Error(`Failed to find notes of asset ${assetIdB} that sum to ${value}.`);
    }

    // If we need more than 1 note for asset B OR the single note we found is too large,
    // then we require J/S txs on asset A.
    // We will not be able to use J/S on input asset A!! This is checked further down...
    requireJoinSplitForAssetB = notesB.length > 1 || notesB[0].value !== value;
  }

  {
    const assetIdA = bridgeCallData.inputAssetIdA;
    const valueA = value + (requireFeePayingTx ? BigInt(0) : fee.value);
    // If a J/S operation is required for asset B then we require that the input note for asset A is NOT pending.
    // Also, if any of the input notes for asset B are pending then the input note for asset A must NOT be pending.
    const optionsA = {
      ...options,
      excludePendingNotes: requireJoinSplitForAssetB || notesB.some(n => n.pending),
    };
    // If we have 2 input assets then search for a single note.
    const note1 = hasTwoAssets ? await notePicker.pickNote(assetIdA, valueA, optionsA) : undefined;
    // If we have a single note, great! If not then search for more notes.
    notesA = note1 ? [note1] : await notePicker.pickNotes(assetIdA, valueA, optionsA);
    if (!notesA.length) {
      throw new Error(`Failed to find notes of asset ${assetIdA} that sum to ${valueA}.`);
    }

    // We require J/S txs on asset A:
    //  - if the total note value for asset A is greater then required.
    //  - if the number of notes for asset A is greater than 2.
    //  - if the number of notes for asset A is greater than 1 AND we have 2 input assets.
    const totalInputNoteValueForAssetA = notesA.reduce((sum, note) => sum + note.value, BigInt(0));
    const requireJoinSplitForAssetA =
      totalInputNoteValueForAssetA > valueA || notesA.length > 2 || (hasTwoAssets && notesA.length > 1);

    // At this point, if we need J/S txs on both input assets then the tx can't be executed.
    if (requireJoinSplitForAssetA && requireJoinSplitForAssetB) {
      throw new Error(`Cannot find a note with the exact value for asset ${assetIdA}. Require ${valueA}.`);
    }
  }

  return await Promise.all([...notesA, ...notesB, ...feeNotes].map(note => restoreNotePath(note, worldState)));
};

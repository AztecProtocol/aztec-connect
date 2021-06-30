import { toBufferBE } from '../../bigint_buffer';
import { AccountId } from '../../account_id';
import { EthAddress } from '../../address';
import { AssetId } from '../../asset';
import { Pedersen } from '../../crypto/pedersen';
import { ClaimNoteTxData, NoteAlgorithms, TreeClaimNote, TreeNote } from '../../note_algorithms';
import { numToUInt32BE } from '../../serialize';

export function computeSigningData(
  notes: TreeNote[],
  claimNote: ClaimNoteTxData,
  inputNote1Index: number,
  inputNote2Index: number,
  inputOwner: EthAddress,
  outputOwner: EthAddress,
  inputValue: bigint,
  outputValue: bigint,
  assetId: AssetId,
  numInputNotes: number,
  accountId: AccountId,
  nullifierKey: Buffer,
  pedersen: Pedersen,
  noteAlgos: NoteAlgorithms,
) {
  const isDefiBridge = !claimNote.equals(ClaimNoteTxData.EMPTY);
  const noteCommitments = notes.map(note => noteAlgos.commitNote(note));

  const partialState = noteAlgos.computePartialState(claimNote, accountId);
  const treeClaimNote = new TreeClaimNote(claimNote.value, claimNote.bridgeId, 0, partialState);
  const claimNoteCommitment = noteAlgos.commitClaimNote(treeClaimNote);

  const nullifier1 = noteAlgos.computeNoteNullifier(
    noteCommitments[0],
    inputNote1Index,
    nullifierKey,
    numInputNotes >= 1,
  );
  const nullifier2 = noteAlgos.computeNoteNullifier(
    noteCommitments[1],
    inputNote2Index,
    nullifierKey,
    numInputNotes >= 2,
  );

  const outputNotes = [isDefiBridge ? claimNoteCommitment : noteCommitments[2], noteCommitments[3]];

  const totalInputValue = notes[0].value + notes[1].value + inputValue;
  const publicOutput = isDefiBridge ? claimNote.value : outputValue;
  const totalOutputValue = notes[2].value + notes[3].value + publicOutput;
  const txFee = totalInputValue - totalOutputValue;
  const toCompress = [
    toBufferBE(inputValue, 32),
    toBufferBE(publicOutput, 32),
    isDefiBridge ? claimNote.bridgeId.toBuffer() : numToUInt32BE(assetId, 32),
    ...outputNotes.map(note => [note.slice(0, 32), note.slice(32, 64)]).flat(),
    nullifier1,
    nullifier2,
    Buffer.concat([Buffer.alloc(12), inputOwner.toBuffer()]),
    Buffer.concat([Buffer.alloc(12), outputOwner.toBuffer()]),
    toBufferBE(txFee, 32),
  ];
  return pedersen.compressInputs(toCompress);
}

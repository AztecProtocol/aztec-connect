import { NoteAlgorithms, TreeNote } from '@aztec/barretenberg/note_algorithms';
import { Note } from './note';

export const treeNoteToNote = (
  treeNote: TreeNote,
  privateKey: Buffer,
  noteAlgos: NoteAlgorithms,
  { allowChain = false, gibberish = false } = {},
) => {
  const commitment = noteAlgos.valueNoteCommitment(treeNote);
  const nullifier = noteAlgos.valueNoteNullifier(commitment, privateKey, !gibberish);
  return new Note(treeNote, commitment, nullifier, allowChain, false);
};

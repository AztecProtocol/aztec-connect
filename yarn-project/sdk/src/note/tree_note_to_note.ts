import { NoteAlgorithms, TreeNote } from '@aztec/barretenberg/note_algorithms';
import { Note } from '../note/index.js';

export const treeNoteToNote = (
  treeNote: TreeNote,
  privateKey: Buffer,
  noteAlgos: NoteAlgorithms,
  {
    allowChain = false,
    gibberish = false,
    nullified = false,
    index,
    hashPath,
  }: { allowChain?: boolean; gibberish?: boolean; nullified?: boolean; index?: number; hashPath?: Buffer } = {},
) => {
  const commitment = noteAlgos.valueNoteCommitment(treeNote);
  const nullifier = noteAlgos.valueNoteNullifier(commitment, privateKey, !gibberish);
  return new Note(treeNote, commitment, nullifier, allowChain, nullified, index, hashPath);
};

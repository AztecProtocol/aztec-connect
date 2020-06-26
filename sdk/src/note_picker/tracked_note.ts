import { Note } from 'barretenberg/client_proofs/note';

export interface TrackedNote {
  index: number;
  note: Note;
}

export const noteSum = (notes: TrackedNote[]): number => {
  return notes.reduce((sum, note) => sum + note.note.value, 0);
};

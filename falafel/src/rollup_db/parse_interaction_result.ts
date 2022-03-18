import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';

export const parseInteractionResult = (buf: Buffer) => {
  const numNotes = buf.length / DefiInteractionNote.LENGTH;
  const notes: DefiInteractionNote[] = [];
  for (let i = 0; i < numNotes; ++i) {
    const startIndex = i * DefiInteractionNote.LENGTH;
    const note = DefiInteractionNote.fromBuffer(buf.slice(startIndex, startIndex + DefiInteractionNote.LENGTH));
    notes.push(note);
  }
  return notes;
};

import { EthAddress } from '../../address';
import { Pedersen } from '../../crypto/pedersen';
import { Note } from '../note';
import { NoteAlgorithms } from '../note_algorithms';

export function computeSigningData(
  notes: Note[],
  outputOwner: EthAddress,
  pedersen: Pedersen,
  noteAlgos: NoteAlgorithms,
) {
  const encryptedNotes = notes.map(note => noteAlgos.encryptNote(note));
  const toCompress = [
    ...encryptedNotes.map(note => [note.slice(0, 32), note.slice(32, 64)]).flat(),
    Buffer.concat([Buffer.alloc(12), outputOwner.toBuffer()]),
  ];
  return pedersen.compressInputs(toCompress);
}

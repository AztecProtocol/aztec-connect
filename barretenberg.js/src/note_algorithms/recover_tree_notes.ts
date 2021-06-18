import { GrumpkinAddress } from '../address';
import { Grumpkin } from '../ecc/grumpkin';
import { DecryptedNote } from './decrypted_note';
import { deriveNoteSecret } from './derive_note_secret';
import { NoteAlgorithms } from './note_algorithms';
import { TreeNote } from './tree_note';

export const recoverTreeNotes = (
  decryptedNotes: (DecryptedNote | undefined)[],
  noteCommitments: Buffer[],
  privateKey: Buffer,
  grumpkin: Grumpkin,
  noteAlgorithms: NoteAlgorithms,
) => {
  const ownerPubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));
  return decryptedNotes.map((decrypted, i) => {
    if (!decrypted) {
      return;
    }

    const noteCommitment = noteCommitments[i];

    // Note version 1
    {
      const note = TreeNote.recover(decrypted, ownerPubKey);
      const commitment = noteAlgorithms.encryptNote(note);
      if (commitment.equals(noteCommitment)) {
        return note;
      }
    }

    // Note version 0
    {
      const noteSecret = deriveNoteSecret(decrypted.ephPubKey, privateKey, grumpkin, 0);
      const note = TreeNote.recover({ ...decrypted, noteSecret }, ownerPubKey);
      const commitment = noteAlgorithms.encryptNote(note);
      if (commitment.equals(noteCommitment)) {
        return note;
      }
    }
  });
};

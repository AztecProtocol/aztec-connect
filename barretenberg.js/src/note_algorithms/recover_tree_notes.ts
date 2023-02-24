import { GrumpkinAddress } from '../address/index.js';
import { createDebugLogger } from '../log/index.js';
import { DecryptedNote } from './decrypted_note.js';
import { NoteAlgorithms } from './note_algorithms.js';
import { TreeNote } from './tree_note.js';

const debug = createDebugLogger('recover_tree_notes');

export const recoverTreeNotes = (
  decryptedNotes: (DecryptedNote | undefined)[],
  inputNullifiers: Buffer[],
  noteCommitments: Buffer[],
  ownerPubKey: GrumpkinAddress,
  noteAlgorithms: NoteAlgorithms,
) => {
  return decryptedNotes.map((decrypted, i) => {
    if (!decrypted) {
      debug(`index ${i}: no decrypted tree note.`);
      return;
    }

    const noteCommitment = noteCommitments[i];
    const inputNullifier = inputNullifiers[i];

    const note = TreeNote.recover(decrypted, inputNullifier, ownerPubKey);
    debug({ note });
    const commitment = noteAlgorithms.valueNoteCommitment(note);
    if (commitment.equals(noteCommitment)) {
      debug(`index ${i}: tree commitment ${noteCommitment.toString('hex')} matches note version 1.`);
      return note;
    }
    debug(
      `index ${i}: tree commitment ${noteCommitment.toString('hex')} != encrypted note commitment ${commitment.toString(
        'hex',
      )}.`,
    );
  });
};

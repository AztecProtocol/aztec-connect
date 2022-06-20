import { GrumpkinAddress } from '../address';
import { createDebugLogger } from '../log';
import { Grumpkin } from '../ecc/grumpkin';
import { DecryptedNote } from './decrypted_note';
import { NoteAlgorithms } from './note_algorithms';
import { TreeNote } from './tree_note';

const debug = createDebugLogger('recover_tree_notes');

export const recoverTreeNotes = (
  decryptedNotes: (DecryptedNote | undefined)[],
  inputNullifiers: Buffer[],
  noteCommitments: Buffer[],
  privateKey: Buffer,
  grumpkin: Grumpkin,
  noteAlgorithms: NoteAlgorithms,
) => {
  const ownerPubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));
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

import { GrumpkinAddress } from '../address';
import { Grumpkin } from '../ecc/grumpkin';
import { ViewingKey } from '../viewing_key';
import { DecryptedNote } from './decrypted_note';
import { deriveNoteSecret } from './derive_note_secret';
import { NoteDecryptor } from './note_decryptor/note_decryptor';

export const batchDecryptNotes = async (
  viewingKeys: Buffer,
  privateKey: Buffer,
  noteDecryptor: NoteDecryptor,
  grumpkin: Grumpkin,
) => {
  const decryptedNoteLength = 73;
  const dataBuf = await noteDecryptor.batchDecryptNotes(viewingKeys, privateKey);
  const notes: (DecryptedNote | undefined)[] = [];

  // For each note in the buffer of decrypted notes.
  for (let i = 0, startIndex = 0; startIndex < dataBuf.length; ++i, startIndex += decryptedNoteLength) {
    // Slice the individual note out the buffer.
    const noteBuf = dataBuf.slice(startIndex, startIndex + decryptedNoteLength);

    // If we sliced some data, and the "successfully decrypted" byte is set...
    if (noteBuf.length > 0 && noteBuf[0]) {
      // Extract the ephemeral public key from the end of viewing key data.
      const ephPubKey = new GrumpkinAddress(
        viewingKeys.slice((i + 1) * ViewingKey.SIZE - 64, (i + 1) * ViewingKey.SIZE),
      );
      const noteSecret = deriveNoteSecret(ephPubKey, privateKey, grumpkin);
      notes[i] = { noteBuf: noteBuf.slice(1), ephPubKey, noteSecret };
    }
  }
  return notes;
};

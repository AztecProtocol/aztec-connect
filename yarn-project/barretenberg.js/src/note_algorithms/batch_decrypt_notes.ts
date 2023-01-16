import { GrumpkinAddress } from '../address/index.js';
import { Grumpkin } from '../ecc/grumpkin/index.js';
import { ViewingKey, ViewingKeyData } from '../viewing_key/index.js';
import { DecryptedNote } from './decrypted_note.js';
import { deriveNoteSecret } from './derive_note_secret.js';
import { NoteDecryptor } from './note_decryptor/index.js';

export const batchDecryptNotes = async (
  viewingKeys: Buffer,
  privateKey: Buffer,
  noteDecryptor: NoteDecryptor,
  grumpkin: Grumpkin,
) => {
  const dataBufs = await noteDecryptor.batchDecryptNotes(viewingKeys, privateKey);
  const notes: (DecryptedNote | undefined)[] = [];

  // For each note in the buffer of decrypted notes.
  for (let i = 0, startIndex = 0; startIndex < dataBufs.length; ++i, startIndex += ViewingKeyData.DECRYPTED_SIZE) {
    // Slice the individual note out the buffer.
    const dataBuf = dataBufs.slice(startIndex, startIndex + ViewingKeyData.DECRYPTED_SIZE);

    // If we sliced some data, and the "successfully decrypted" byte is set...
    if (dataBuf[0]) {
      // Extract the ephemeral public key from the end of viewing key data.
      const ephPubKey = new GrumpkinAddress(
        viewingKeys.slice((i + 1) * ViewingKey.SIZE - 64, (i + 1) * ViewingKey.SIZE),
      );
      const noteSecret = deriveNoteSecret(ephPubKey, privateKey, grumpkin);
      const data = ViewingKeyData.fromBuffer(dataBuf.slice(1));
      notes[i] = new DecryptedNote(data, ephPubKey, noteSecret);
    }
  }
  return notes;
};

import { NoteAlgorithms } from './note_algorithms';
import { GrumpkinAddress } from '../../address';
import { Grumpkin } from '../../ecc/grumpkin';
import { ViewingKey } from '../../viewing_key';
import { deriveNoteSecret } from './derive_note_secret';
import { DecryptedNote } from './decrypted_note';

export const batchDecryptNotes = async (
  viewingKeys: Buffer,
  privateKey: Buffer,
  noteAlgorithms: NoteAlgorithms,
  grumpkin: Grumpkin,
) => {
  const decryptedNoteLength = 41;
  const dataBuf = await noteAlgorithms.batchDecryptNotes(viewingKeys, privateKey);
  const notes: (DecryptedNote | undefined)[] = [];
  for (let i = 0, startIndex = 0; startIndex < dataBuf.length; ++i, startIndex += decryptedNoteLength) {
    const noteBuf = dataBuf.slice(startIndex, startIndex + decryptedNoteLength);
    if (noteBuf.length > 0 && noteBuf[0]) {
      const ephPubKey = new GrumpkinAddress(
        viewingKeys.slice((i + 1) * ViewingKey.SIZE - 64, (i + 1) * ViewingKey.SIZE),
      );
      const noteSecret = deriveNoteSecret(ephPubKey, privateKey, grumpkin);
      notes[i] = { noteBuf: noteBuf.slice(1), ephPubKey, noteSecret };
    }
  }
  return notes;
};

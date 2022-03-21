/// <reference types="node" />
import { NoteAlgorithms } from './note_algorithms';
import { Grumpkin } from '../ecc/grumpkin';
import { DecryptedNote } from './decrypted_note';
export declare const batchDecryptNotes: (viewingKeys: Buffer, inputNullifiers: Buffer[], privateKey: Buffer, noteAlgorithms: NoteAlgorithms, grumpkin: Grumpkin) => Promise<(DecryptedNote | undefined)[]>;
//# sourceMappingURL=batch_decrypt_notes.d.ts.map
/// <reference types="node" />
import { Grumpkin } from '../ecc/grumpkin';
import { DecryptedNote } from './decrypted_note';
import { NoteAlgorithms } from './note_algorithms';
import { TreeNote } from './tree_note';
export declare const recoverTreeNotes: (decryptedNotes: (DecryptedNote | undefined)[], noteCommitments: Buffer[], privateKey: Buffer, grumpkin: Grumpkin, noteAlgorithms: NoteAlgorithms) => (TreeNote | undefined)[];
//# sourceMappingURL=recover_tree_notes.d.ts.map
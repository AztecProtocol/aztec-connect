/// <reference types="node" />
import { GrumpkinAddress } from '../address';
export interface DecryptedNote {
    noteBuf: Buffer;
    ephPubKey: GrumpkinAddress;
    noteSecret: Buffer;
    inputNullifier: Buffer;
}
//# sourceMappingURL=decrypted_note.d.ts.map
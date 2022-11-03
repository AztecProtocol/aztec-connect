import { GrumpkinAddress } from '../address/index.js';

export interface DecryptedNote {
  noteBuf: Buffer; // [value, assetId, accountRequired, creatorPubKey]
  ephPubKey: GrumpkinAddress;
  noteSecret: Buffer;
}

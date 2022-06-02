import { GrumpkinAddress } from '../address';

export interface DecryptedNote {
  noteBuf: Buffer; // [value, assetId, accountRequired, creatorPubKey]
  ephPubKey: GrumpkinAddress;
  noteSecret: Buffer;
}

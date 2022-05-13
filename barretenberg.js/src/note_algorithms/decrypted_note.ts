import { GrumpkinAddress } from '../address';

export interface DecryptedNote {
  noteBuf: Buffer; // [value, assetId, accountNonce, creatorPubKey]
  ephPubKey: GrumpkinAddress;
  noteSecret: Buffer;
}

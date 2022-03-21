import { GrumpkinAddress } from '../address';

export interface DecryptedNote {
  noteBuf: Buffer; // [value, assetId, nonce, creatorPubKey]
  ephPubKey: GrumpkinAddress;
  noteSecret: Buffer;
  inputNullifier: Buffer;
}

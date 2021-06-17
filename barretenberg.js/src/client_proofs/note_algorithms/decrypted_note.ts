import { GrumpkinAddress } from '../../address';

export interface DecryptedNote {
  noteBuf: Buffer;
  ephPubKey: GrumpkinAddress;
  noteSecret: Buffer;
}

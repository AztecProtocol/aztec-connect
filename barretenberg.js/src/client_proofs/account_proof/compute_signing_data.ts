import { GrumpkinAddress } from '../../address';
import { Pedersen } from '../../crypto/pedersen';

export function computeSigningData(
  ownerPublicKey: GrumpkinAddress,
  newSigningPubKey1: GrumpkinAddress,
  newSigningPubKey2: GrumpkinAddress,
  alias: Buffer,
  nullifiedKey: GrumpkinAddress,
  pedersen: Pedersen,
) {
  const toCompress = [ownerPublicKey.x(), newSigningPubKey1.x(), newSigningPubKey2.x(), alias, nullifiedKey.x()];
  return pedersen.compressInputs(toCompress);
}

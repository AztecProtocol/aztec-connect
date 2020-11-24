import { GrumpkinAddress } from '../../address';
import { Pedersen } from '../../crypto/pedersen';
import { AccountId } from '../account_id';

export function computeSigningData(
  accountId: AccountId,
  accountPublicKey: GrumpkinAddress,
  newAccountPublicKey: GrumpkinAddress,
  newSigningPublicKey1: GrumpkinAddress,
  newSigningPublicKey2: GrumpkinAddress,
  pedersen: Pedersen,
) {
  const toCompress = [
    accountId.toBuffer(),
    accountPublicKey.x(),
    newAccountPublicKey.x(),
    newSigningPublicKey1.x(),
    newSigningPublicKey2.x(),
  ];
  return pedersen.compressInputs(toCompress);
}

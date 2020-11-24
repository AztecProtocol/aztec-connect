import { Pedersen } from '../../crypto/pedersen';
import { numToUInt32BE } from '../../serialize';
import { AccountId } from '../account_id';

export function computeAccountIdNullifier(accountId: AccountId, pedersen: Pedersen) {
  const accountIdIndex = 11;
  const proofId = 1;
  const prefixBuf = numToUInt32BE(proofId, 32);
  return pedersen.compressWithHashIndex([prefixBuf, accountId.toBuffer()], accountIdIndex);
}
